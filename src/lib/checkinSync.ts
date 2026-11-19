import { Actor, type ActorSubclass } from '@dfinity/agent';
import type { _SERVICE as AlltracksService } from '../api/alltracks/backend.did';
import type { _SERVICE as CommentService } from '../api/comment/comment.did';
import { submitObjectCheckin } from '../api/object-journey/objects';
import {
  deletePendingCheckin,
  claimDeferredCheckins,
  isGuestGatewayCheckin,
  isOffline,
  listPendingCheckins,
  markPendingError,
  type PendingObjectCheckin,
  type PendingSpotCheckin,
} from './offlineCheckins';
import { encodeObjectCheckinNote } from './checkinPhoto';

export type AlltracksActor = ActorSubclass<AlltracksService>;
export type CommentActor = ActorSubclass<CommentService>;

let inFlight: Promise<number> | null = null;

async function syncSpot(backend: AlltracksActor, comment: CommentActor, item: PendingSpotCheckin) {
  // A QR URL can be typed arbitrarily. Verify the Spot exists before creating
  // a Comment, particularly for an offline submission saved without a lookup.
  const spots = await backend.getSpotById(BigInt(item.spotId));
  if (!spots.length) throw new Error('This Spot no longer exists.');
  const target = { other: 'spot-checkin:' + item.spotId } as const;
  const existing = await comment.getComments(target, 0n);
  const alreadySaved = existing.some(entry => {
    try {
      return JSON.parse(entry.comment).requestId === item.id;
    } catch { return false; }
  });
  if (alreadySaved) return;
  const result = await comment.addComment({
    comto: target,
    comment: JSON.stringify({
      v: 1,
      name: item.name,
      note: item.note,
      photoUrl: item.photoUrl,
      requestId: item.id,
      capturedAt: item.createdAt,
    }),
    attachments: [],
  });
  if ('err' in result) throw new Error(result.err);
}

export async function flushSignedInCheckins(
  backend: AlltracksActor,
  comment: CommentActor,
  principal: string | null,
  retryNow = false,
): Promise<number> {
  if (!principal || isOffline()) return 0;
  const run = async () => {
    let completed = 0;
    // During account changes the actor and the rendered Principal can briefly
    // disagree. Never claim or upload records until both actors match.
    const matchesAccount = async () => {
      try {
        const [objectPrincipal, commentPrincipal] = await Promise.all([
          Actor.agentOf(backend)?.getPrincipal(),
          Actor.agentOf(comment)?.getPrincipal(),
        ]);
        return objectPrincipal?.toText() === principal && commentPrincipal?.toText() === principal;
      } catch { return false; }
    };
    if (!(await matchesAccount())) return 0;
    await claimDeferredCheckins(principal);
    const items = await listPendingCheckins();
    for (const item of items) {
      if (isOffline() || !(await matchesAccount())) break;
      if (!item.principal || item.principal !== principal) continue;
      if (!retryNow && item.nextAttemptAt && item.nextAttemptAt > Date.now()) continue;
      try {
        if (item.kind === 'object') {
          await submitObjectCheckin(backend, item.objectId, {
            latitude: item.latitude,
            longitude: item.longitude,
            accuracyMeters: item.accuracyMeters,
            action: item.action,
            note: item.note,
            photoUrl: item.photoUrl,
            requestId: item.id,
            capturedAt: item.createdAt,
          });
        } else {
          await syncSpot(backend, comment, item);
        }
        await deletePendingCheckin(item.id);
        completed++;
      } catch (error) {
        await markPendingError(item.id, error);
      }
    }
    return completed;
  };
  // Serialize retries from pages and global reconnect handlers, also between
  // multiple tabs on browsers supporting the Web Locks API.
  if (inFlight) return inFlight;
  const execute = async () => {
    if (typeof navigator !== 'undefined' && navigator.locks?.request) {
      return navigator.locks.request('alltracks-checkin-outbox', run);
    }
    return run();
  };
  inFlight = execute();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

export async function syncOneGuestCheckin(
  item: PendingObjectCheckin,
  token: string,
): Promise<void> {
  if (isOffline()) throw new Error('Waiting for an internet connection.');
  if (!isGuestGatewayCheckin(item)) throw new Error('This check-in must sync through its signed-in account.');
  const response = await fetch('/api/objects/' + encodeURIComponent(item.objectId) + '/guest-checkin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitude: item.latitude,
      longitude: item.longitude,
      accuracyMeters: item.accuracyMeters,
      action: item.action,
      note: encodeObjectCheckinNote(item.note, item.photoUrl),
      requestId: item.id,
      turnstileToken: token,
    }),
  });
  const payload = await response.json() as { error?: string };
  // The canister deduplicates requestId; a duplicate means the first request
  // was received even if the client lost its success response.
  if (response.status === 409 && payload.error === 'duplicate') {
    await deletePendingCheckin(item.id);
    return;
  }
  if (!response.ok) throw new Error(payload.error || 'Guest sync failed.');
  await deletePendingCheckin(item.id);
}
