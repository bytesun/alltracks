import { useEffect, useState } from 'react';
import type { HttpAgent } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';
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
      if (alive) setError(err instanceof Error ? err.message : String(err));
    });
    return () => {
      alive = false;
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [objectId, agent, backend, storageCanisterId, reload]);

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
      setError(err instanceof Error ? err.message : String(err));
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
