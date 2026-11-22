import { useEffect, useState } from 'react';
import { queueWanderPhoto, listPendingWanderPhotos, removePendingWanderPhoto, updatePendingWanderPhoto, WANDER_PHOTO_OUTBOX_EVENT, type PendingWanderPhoto } from '../lib/offlineWanderPhotos';
import type { HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { createIceStorageUploadActor } from '../lib/iceStorageActor';
import { validateWanderPhoto } from '../lib/iceStorageUpload';
import { WanderCameraPicker } from './WanderCameraPicker';
import { readPublishedWanderPhoto } from '../lib/iceStoragePublicPhoto';
import {
  publishOwnedWanderPhoto, resumeOwnedWanderPhotoPublication,
  loadWanderPhotos, deleteWanderPhoto, reconcileWanderPhotoCleanup,
  type WanderPhotoLifecycleBackend,
} from '../lib/wanderPhotoLifecycle';

type Photo = { storageObjectId: string; url: string };
type Checkpoint = { timestamp: bigint; author: Principal; label: string };

export function WanderPhotoGallery({
  objectId, agent, backend, owner, signedIn, principalId, checkpoints = [], storageCanisterId,
}: {
  objectId: string;
  agent: HttpAgent;
  backend: WanderPhotoLifecycleBackend;
  owner: boolean;
  signedIn: boolean;
  principalId: string | null;
  checkpoints?: Checkpoint[];
  storageCanisterId?: string;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pending, setPending] = useState<PendingWanderPhoto[]>([]);
  const [online, setOnline] = useState(navigator.onLine);
  const [file, setFile] = useState<File | null>(null);
  const [checkpointIndex, setCheckpointIndex] = useState('-1');
  const [recoverId, setRecoverId] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = () => { void listPendingWanderPhotos(objectId).then(items => { if (active) setPending(items); }); };
    const connectivity = () => { setOnline(navigator.onLine); refresh(); };
    refresh();
    window.addEventListener(WANDER_PHOTO_OUTBOX_EVENT, refresh);
    window.addEventListener('online', connectivity);
    window.addEventListener('offline', connectivity);
    return () => { active = false; window.removeEventListener(WANDER_PHOTO_OUTBOX_EVENT, refresh);
      window.removeEventListener('online', connectivity); window.removeEventListener('offline', connectivity); };
  }, [objectId]);

  useEffect(() => {
    if (!online || !owner || !signedIn || !principalId) return;
    let active = true;
    const flush = async () => {
      const items = await listPendingWanderPhotos(objectId);
      for (const item of items) {
        if (!active || !navigator.onLine) return;
        // A photo captured under a different identity cannot be reassigned.
        if (item.principal && item.principal !== principalId) continue;
        if (item.nextAttemptAt > Date.now()) continue;
        try {
          const checkpoint = item.checkpoint ? {
            timestamp: BigInt(item.checkpoint.timestamp), author: Principal.fromText(item.checkpoint.author),
          } : undefined;
          if (item.uploadedStorageObjectId) {
            await resumeOwnedWanderPhotoPublication(objectId, item.uploadedStorageObjectId, backend, checkpoint);
          } else {
            await publishOwnedWanderPhoto(item.file, objectId, agent, backend, checkpoint,
              undefined, storageCanisterId);
          }
          await removePendingWanderPhoto(item.id);
          if (active) setReload(value => value + 1);
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          const storageId = reason.match(/Uploaded storage object:\s*([a-zA-Z0-9-]{5,256})/i)?.[1];
          await updatePendingWanderPhoto({ ...item,
            uploadedStorageObjectId: item.uploadedStorageObjectId ?? storageId,
            attempts: item.attempts + 1,
            lastError: error instanceof Error ? error.message : String(error),
            nextAttemptAt: Date.now() + Math.min(300_000, 5000 * 2 ** Math.min(item.attempts, 6)) });
          // Avoid repeatedly sending failed grants or uploads in one pass.
          return;
        }
      }
    };
    void flush().catch(error => { if (active) setError(error instanceof Error ? error.message : String(error)); });
    const timer = window.setInterval(() => { if (active && navigator.onLine) void flush(); }, 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [objectId, online, owner, signedIn, principalId, agent, backend, storageCanisterId]);

  useEffect(() => {
    let alive = true;
    const urls: string[] = [];
    setError('');
    void loadWanderPhotos(objectId, agent, backend, storageCanisterId).then(items => {
      const next = items.map(item => {
        const url = URL.createObjectURL(item.blob);
        urls.push(url);
        return { storageObjectId: item.storageObjectId, url };
      });
      if (alive) setPhotos(next);
      else urls.forEach(url => URL.revokeObjectURL(url));
    }).catch(err => {
      if (alive && owner) setError(err instanceof Error ? err.message : String(err));
    });
    return () => {
      alive = false;
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [objectId, agent, backend, owner, storageCanisterId, reload]);

  // Opportunistic cleanup while an authenticated owner views the journey.
  // Backend durable tombstones keep failures retryable across page reloads.
  useEffect(() => {
    if (!owner) return;
    let active = true;
    let running = false;
    const reconcile = async () => {
      if (!active || running || !navigator.onLine) return;
      running = true;
      try {
        const result = await reconcileWanderPhotoCleanup(objectId, backend);
        if (active && result.cleaned > 0) setReload(value => value + 1);
      } catch { /* Backend retains the cleanup queue for the next attempt. */ }
      finally { running = false; }
    };
    void reconcile();
    const timer = window.setInterval(() => void reconcile(), 30_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [owner, objectId, backend]);

  const checkpoint = Number(checkpointIndex) >= 0 ? checkpoints[Number(checkpointIndex)] : undefined;
  const selectedCheckpoint = checkpoint
    ? { timestamp: checkpoint.timestamp, author: checkpoint.author }
    : undefined;

  async function execute(task: () => Promise<void>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await task();
      setReload(value => value + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Upload can finish before publication fails. Preserve the server-issued
      // ID in the recovery input instead of asking the user to copy a log.
      const recoveredId = message.match(/(?:Uploaded storage object|Storage Object ID):\s*([a-zA-Z0-9-]{5,256})/i);
      if (recoveredId) setRecoverId(recoveredId[1]);
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="journey-panel" aria-label="Stored Wander photos">
      <div className="journey-section-title"><h2>Journey photos</h2><span>ICEStorage</span></div>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {photos.length === 0 && <p>No published storage photos yet.</p>}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {photos.map(photo => (
          <figure key={photo.storageObjectId} style={{ margin: 0, maxWidth: 240 }}>
            <img src={photo.url} alt="Wander object journey" style={{ width: '100%', borderRadius: 10 }} />
            {owner && <button type="button" disabled={busy} onClick={() => {
              if (!window.confirm('Permanently remove this published photo?')) return;
              void execute(async () => {
                await deleteWanderPhoto(objectId, photo.storageObjectId, backend);
                setNotice('Photo deleted.');
              });
            }}>Remove photo</button>}
          </figure>
        ))}
      </div>
      {pending.length > 0 && <div role="status">
        <p>{pending.length} photo(s) saved on this device. {online ? 'Waiting for authorized upload.' : 'Will retry when online.'}</p>
        {pending.map(item => <div key={item.id}>
          <span>{item.file.name} {item.lastError && `— ${item.lastError}`}</span>
          <button type="button" onClick={() => void removePendingWanderPhoto(item.id)}>Discard local photo</button>
        </div>)}
      </div>}
      {!owner && <p>Photos taken without signing in stay on this device. To upload them, sign in as this Object's owner.</p>}
      {<>
        <p>Take a photo; if offline or not signed in as owner, save it locally for later.</p>
        <WanderCameraPicker value={file} onChange={setFile} disabled={busy} />
        <button type="button" disabled={busy || !file} onClick={() => {
          if (!file) return;
          void execute(async () => {
            await queueWanderPhoto({ objectId, file, principal: signedIn ? principalId : null,
              checkpoint: selectedCheckpoint ? { timestamp: selectedCheckpoint.timestamp,
                author: selectedCheckpoint.author.toText() } : undefined });
            setFile(null);
            setNotice('Photo saved locally. Upload resumes when online and signed in as Object owner.');
          });
        }}>Save photo on this device</button>
      </>}
      {owner && <>
        <p>Upload selected photo immediately when online, or save it locally above.</p>
        <label>Attach to Checkpoint (optional)
          <select value={checkpointIndex} disabled={busy} onChange={event => setCheckpointIndex(event.target.value)}>
            <option value="-1">Object photo (no Checkpoint)</option>
            {checkpoints.map((cp, index) => <option key={index} value={String(index)}>{cp.label}</option>)}
          </select>
        </label>
        <button type="button" disabled={busy || !file || !online} onClick={() => {
          if (!file) return;
          void execute(async () => {
            validateWanderPhoto(file);
            const uploaded = await publishOwnedWanderPhoto(
              file, objectId, agent, backend, selectedCheckpoint,
              (done, total) => setProgress(Math.round(done * 100 / total)), storageCanisterId,
            );
            setRecoverId(uploaded.storageObjectId);
            setNotice('Photo published.');
            setFile(null);
            setProgress(0);
          });
        }}>{busy ? 'Working…' : 'Upload and publish'}</button>
        {busy && <p role="status">Uploading / publishing… {progress}%</p>}
        <details>
          <summary>Recover an interrupted publication</summary>
          <label>Storage Object ID
            <input value={recoverId} disabled={busy} onChange={event => setRecoverId(event.target.value)} />
          </label>
          <button type="button" disabled={busy || !recoverId} onClick={() => void execute(async () => {
            await resumeOwnedWanderPhotoPublication(objectId, recoverId, backend, selectedCheckpoint);
            setNotice('Publication reconciled.');
          })}>Resume publication</button>
          <button type="button" disabled={busy} onClick={() => void execute(async () => {
            const result = await reconcileWanderPhotoCleanup(objectId, backend);
            setNotice(`Cleaned ${result.cleaned}; pending ${result.pending}.`);
            if (result.errors.length) setError(result.errors.join('; '));
          })}>Retry pending photo cleanup</button>
        </details>
      </>}
    </section>
  );
}

/** Render only photos explicitly attached to this Checkpoint. */
export function WanderCheckpointPhotos({ objectId, timestamp, author, agent, backend, storageCanisterId }: {
  objectId: string; timestamp: bigint; author: Principal; agent: HttpAgent;
  backend: WanderPhotoLifecycleBackend; storageCanisterId?: string;
}) {
  const [urls, setUrls] = useState<string[]>([]);
  const authorId = author.toText();
  useEffect(() => {
    let active = true;
    const created: string[] = [];
    void (async () => {
      const bindings = await backend.listWanderCheckpointPhotos(objectId, timestamp, Principal.fromText(authorId));
      const storage = createIceStorageUploadActor(agent, storageCanisterId);
      for (const binding of bindings) {
        if (binding.objectId !== objectId || binding.storageId !== 'project-wander-photo' ||
            binding.resourceId !== binding.storageObjectId) continue;
        try {
          const blob = await readPublishedWanderPhoto(storage, {
            resourceId: binding.resourceId,
            storage: { storageId: binding.storageId, owner: { principal: binding.storageOwner } },
          }, binding.storageObjectId);
          const url = URL.createObjectURL(blob);
          created.push(url);
        } catch { /* A revoked photo is intentionally not shown. */ }
      }
      if (active) setUrls([...created]);
      else created.forEach(url => URL.revokeObjectURL(url));
    })().catch(() => { if (active) setUrls([]); });
    return () => { active = false; created.forEach(url => URL.revokeObjectURL(url)); };
  }, [objectId, timestamp, authorId, agent, backend, storageCanisterId]);
  if (urls.length === 0) return null;
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
    {urls.map(url => <img key={url} src={url} alt="Photo attached to this check-in"
      style={{ width: 180, maxWidth: '100%', borderRadius: 8 }} />)}
  </div>;
}
