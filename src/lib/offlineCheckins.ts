import { openDB } from 'idb';
import { encodeObjectCheckinNote, normalizeCheckinPhotoUrl } from './checkinPhoto.ts';

export const CHECKIN_OUTBOX_EVENT = 'alltracks:checkin-outbox-updated';
const DB_NAME = 'alltracks-checkin-outbox';
const STORE_NAME = 'checkins';
const MAX_PENDING = 100;

type BasePending = {
  id: string;
  createdAt: number;
  attempts: number;
  lastError: string;
  nextAttemptAt?: number;
};

export type PendingObjectCheckin = BasePending & {
  kind: 'object';
  objectId: string;
  // Null means a guest submission (only the Turnstile gateway can sync it).
  principal: string | null;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  action: 'found' | 'carried' | 'left';
  note: string;
  photoUrl: string;
};

export type PendingSpotCheckin = BasePending & {
  kind: 'spot';
  spotId: string;
  principal: string;
  name: string;
  note: string;
  photoUrl: string;
};

export type PendingCheckin = PendingObjectCheckin | PendingSpotCheckin;
export type NewObjectCheckin = Omit<PendingObjectCheckin, keyof BasePending>;
export type NewSpotCheckin = Omit<PendingSpotCheckin, keyof BasePending>;

const openOutbox = () => openDB(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  },
});

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function announce(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(CHECKIN_OUTBOX_EVENT));
}

export function normalizeQueuedObject(data: NewObjectCheckin): NewObjectCheckin {
  if (!/^obj-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.objectId)) throw new Error('Invalid object ID.');
  if (!['found', 'carried', 'left'].includes(data.action)) throw new Error('Invalid check-in action.');
  if (![data.latitude, data.longitude, data.accuracyMeters].every(Number.isFinite) ||
      Math.abs(data.latitude) > 90 || Math.abs(data.longitude) > 180 ||
      data.accuracyMeters < 0 || data.accuracyMeters > 2000) {
    throw new Error('GPS coordinates or accuracy are invalid. Please refresh location.');
  }
  if (typeof data.note !== 'string' || typeof data.photoUrl !== 'string') {
    throw new Error('Invalid check-in note or photo URL.');
  }
  // The same 280-character bounded note goes to signed-in and guest paths.
  encodeObjectCheckinNote(data.note, data.photoUrl);
  return {
    ...data,
    // Exact browser GPS is discarded before any persistent local write.
    latitude: Number(data.latitude.toFixed(3)),
    longitude: Number(data.longitude.toFixed(3)),
    accuracyMeters: Math.round(data.accuracyMeters),
    note: data.note.trim(),
    photoUrl: normalizeCheckinPhotoUrl(data.photoUrl),
  };
}

export function normalizeQueuedSpot(data: NewSpotCheckin): NewSpotCheckin {
  if (!/^\d+$/.test(data.spotId) || !data.principal) {
    throw new Error('Sign in before saving a Spot check-in.');
  }
  if (data.name.length > 40 || data.note.length > 500) {
    throw new Error('Spot check-in name or note is too long.');
  }
  return {
    ...data,
    name: data.name.trim(),
    note: data.note.trim(),
    photoUrl: normalizeCheckinPhotoUrl(data.photoUrl),
  };
}

async function enqueue(data: NewObjectCheckin | NewSpotCheckin): Promise<PendingCheckin> {
  const db = await openOutbox();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const count = await tx.store.count();
  if (count >= MAX_PENDING) {
    await tx.done;
    throw new Error('100 check-ins are already saved on this device. Sync or review them first.');
  }
  const item = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    attempts: 0,
    lastError: '',
  } as PendingCheckin;
  await tx.store.add(item);
  await tx.done;
  announce();
  return item;
}

export async function queueObjectCheckin(data: NewObjectCheckin): Promise<PendingObjectCheckin> {
  return enqueue(normalizeQueuedObject(data)) as Promise<PendingObjectCheckin>;
}

export async function queueSpotCheckin(data: NewSpotCheckin): Promise<PendingSpotCheckin> {
  return enqueue(normalizeQueuedSpot(data)) as Promise<PendingSpotCheckin>;
}

export async function listPendingCheckins(): Promise<PendingCheckin[]> {
  const db = await openOutbox();
  const records = await db.getAll(STORE_NAME) as PendingCheckin[];
  return records.sort((a, b) => a.createdAt - b.createdAt);
}

export async function deletePendingCheckin(id: string): Promise<void> {
  const db = await openOutbox();
  await db.delete(STORE_NAME, id);
  announce();
}

export async function markPendingError(id: string, error: unknown): Promise<void> {
  const db = await openOutbox();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const current = await tx.store.get(id) as PendingCheckin | undefined;
  if (current) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    await tx.store.put({
      ...current,
      attempts: current.attempts + 1,
      lastError: message.slice(0, 180),
      nextAttemptAt: Date.now() + Math.min(5 * 60_000, 10_000 * 2 ** Math.min(5, current.attempts)),
    });
  }
  await tx.done;
  announce();
}
