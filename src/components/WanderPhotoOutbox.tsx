import { useCallback, useEffect, useRef, useState } from 'react';
import type { HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { publishOwnedWanderPhoto, resumeOwnedWanderPhotoPublication, type WanderPhotoLifecycleBackend } from '../lib/wanderPhotoLifecycle';
import { listPendingWanderPhotos, removePendingWanderPhoto, updatePendingWanderPhoto, WANDER_PHOTO_OUTBOX_EVENT, type PendingWanderPhoto } from '../lib/offlineWanderPhotos';

/** Durable owner upload worker, mounted wherever Object photos are displayed. */
export function WanderPhotoOutbox({ objectId, agent, backend, owner, principalId, storageCanisterId, onPublished }: {
  objectId: string; agent: HttpAgent; backend: WanderPhotoLifecycleBackend;
  owner: boolean; principalId: string | null; storageCanisterId?: string;
  onPublished?: () => void;
}) {
  const [items, setItems] = useState<PendingWanderPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [discardId, setDiscardId] = useState<string | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const busyRef = useRef(false);
  const refresh = useCallback(async () => {
    const pending = await listPendingWanderPhotos(objectId);
    setItems(pending);
  }, [objectId]);
  useEffect(() => {
    const update = () => { setOnline(navigator.onLine); void refresh(); };
    void refresh();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    window.addEventListener(WANDER_PHOTO_OUTBOX_EVENT, update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      window.removeEventListener(WANDER_PHOTO_OUTBOX_EVENT, update);
    };
  }, [refresh]);
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const item of items) next[item.id] = URL.createObjectURL(item.file);
    setPreviewUrls(next);
    return () => Object.values(next).forEach(url => URL.revokeObjectURL(url));
  }, [items]);
  const sync = useCallback(async (force = false) => {
    if (!owner || !principalId || !navigator.onLine || busyRef.current) return;
    busyRef.current = true;
    setUploading(true);
    try {
      const pending = await listPendingWanderPhotos(objectId);
      for (const item of pending) {
        if (!navigator.onLine) break;
        if (item.principal && item.principal !== principalId) continue;
        if (!force && item.nextAttemptAt > Date.now()) continue;
        let resolvedCheckpoint = item.checkpoint;
        try {
          // Clear the persisted error only when this item actually starts a retry.
          if (item.lastError) await updatePendingWanderPhoto({ ...item, lastError: '' });
          // A photo captured with a check-in must wait for that exact on-chain
          // checkpoint. Never publish it as an unbound Object gallery photo.
          if (!resolvedCheckpoint && item.checkinRequestId) {
            const actor = backend as WanderPhotoLifecycleBackend & {
              getCheckPointsByTrackId(id: string): Promise<Array<{
                note: string; timestamp: bigint; createdBy: Principal; isPublic: boolean;
              }>>;
            };
            const points = await actor.getCheckPointsByTrackId(objectId);
            const found = points.filter(point => {
              if (!point.isPublic || !point.note.startsWith('alltracks:object-checkin:v1:')) return false;
              try {
                return JSON.parse(point.note.slice('alltracks:object-checkin:v1:'.length)).requestId === item.checkinRequestId;
              } catch { return false; }
            });
            if (found.length !== 1) {
              // A check-in may still be syncing. Keep the photo queued.
              if (found.length === 0) continue;
              throw new Error('Multiple checkpoints matched this photo; manual review required.');
            }
            resolvedCheckpoint = { timestamp: String(found[0].timestamp), author: found[0].createdBy.toText() };
            await updatePendingWanderPhoto({ ...item, checkpoint: resolvedCheckpoint, lastError: '' });
          }
          const checkpoint = resolvedCheckpoint ? {
            timestamp: BigInt(resolvedCheckpoint.timestamp), author: Principal.fromText(resolvedCheckpoint.author),
          } : undefined;
          if (item.uploadedStorageObjectId) {
            await resumeOwnedWanderPhotoPublication(objectId, item.uploadedStorageObjectId, backend, checkpoint);
          } else {
            await publishOwnedWanderPhoto(item.file, objectId, agent, backend, checkpoint, undefined, storageCanisterId);
          }
          await removePendingWanderPhoto(item.id);
          window.dispatchEvent(new CustomEvent('alltracks:wander-photo-published', { detail: objectId }));
          onPublished?.();
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : String(cause);
          const uploadedId = message.match(/Uploaded storage object:\s*([a-zA-Z0-9-]{5,256})/i)?.[1];
          await updatePendingWanderPhoto({ ...item,
            checkpoint: resolvedCheckpoint,
            uploadedStorageObjectId: item.uploadedStorageObjectId ?? uploadedId,
            attempts: item.attempts + 1,
            lastError: message,
            nextAttemptAt: Date.now() + Math.min(300_000, 5000 * 2 ** Math.min(item.attempts, 6)),
          });
          break;
        }
      }
    } finally {
      busyRef.current = false;
      setUploading(false);
      await refresh();
    }
  }, [objectId, agent, backend, owner, principalId, storageCanisterId, onPublished, refresh]);
  useEffect(() => {
    if (!online || !owner || !principalId) return;
    void sync().catch(() => {});
    const timer = window.setInterval(() => { void sync().catch(() => {}); }, 30_000);
    return () => window.clearInterval(timer);
  }, [online, owner, principalId, sync]);
  if (items.length === 0) return null;
  return <div className="wander-photo-outbox" role="status">
    {items.map(item => <div key={item.id} style={{ padding: '8px 0' }}>
      {previewUrls[item.id] && <img src={previewUrls[item.id]} alt="Photo saved on this device"
        style={{ width: 120, maxWidth: '100%', borderRadius: 10 }} />}
      <p>{uploading ? 'Uploading photo…' : !online ? 'Photo saved offline' :
        !owner ? 'Saved locally — Object owner authorization required' :
        item.lastError ? `Photo not published: ${item.lastError}` : 'Photo saved locally — awaiting upload'}</p>
      {owner && principalId && online && <button type="button" disabled={uploading}
        onClick={() => void sync(true)}>Retry upload</button>}
      <button type="button" disabled={uploading} onClick={() => setDiscardId(item.id)}>Discard local photo</button>
    </div>)}
    <DeleteConfirmModal open={discardId !== null} title="Discard this local photo?"
      description="This photo has not been published. Discarding it will permanently remove the saved copy from this device."
      onCancel={() => setDiscardId(null)}
      onConfirm={() => { if (discardId) { void removePendingWanderPhoto(discardId).then(() => { setDiscardId(null); void refresh(); }); } }} />
  </div>;
}
