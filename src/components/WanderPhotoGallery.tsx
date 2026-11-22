import { useEffect, useState } from 'react';
import type { HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { createIceStorageUploadActor } from '../lib/iceStorageActor';
import { validateWanderPhoto } from '../lib/iceStorageUpload';
import { readPublishedWanderPhoto } from '../lib/iceStoragePublicPhoto';
import {
  publishOwnedWanderPhoto, resumeOwnedWanderPhotoPublication,
  loadWanderPhotos, deleteWanderPhoto, reconcileWanderPhotoCleanup,
  type WanderPhotoLifecycleBackend,
} from '../lib/wanderPhotoLifecycle';

type Photo = { storageObjectId: string; url: string };
type Checkpoint = { timestamp: bigint; author: Principal; label: string };

export function WanderPhotoGallery({
  objectId, agent, backend, owner, checkpoints = [], storageCanisterId,
}: {
  objectId: string;
  agent: HttpAgent;
  backend: WanderPhotoLifecycleBackend;
  owner: boolean;
  checkpoints?: Checkpoint[];
  storageCanisterId?: string;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [checkpointIndex, setCheckpointIndex] = useState('-1');
  const [recoverId, setRecoverId] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);

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
      {owner && <>
        <label>Upload a photo
          <input type="file" accept="image/jpeg,image/png,image/webp"
            disabled={busy} onChange={event => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <label>Attach to Checkpoint (optional)
          <select value={checkpointIndex} disabled={busy} onChange={event => setCheckpointIndex(event.target.value)}>
            <option value="-1">Object photo (no Checkpoint)</option>
            {checkpoints.map((cp, index) => <option key={index} value={String(index)}>{cp.label}</option>)}
          </select>
        </label>
        <button type="button" disabled={busy || !file} onClick={() => {
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
