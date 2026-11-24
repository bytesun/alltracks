import { useEffect, useState } from 'react';
import type { HttpAgent } from '@dfinity/agent';
import { loadWanderPhotos, type WanderPhotoLifecycleBackend } from '../lib/wanderPhotoLifecycle';

/** Object's published ICEStorage photos, without a separate Journey Photos editor. */
export function WanderObjectPhotos({ objectId, agent, backend, storageCanisterId, compact = false, showEmpty = false }: {
  objectId: string; agent: HttpAgent; backend: WanderPhotoLifecycleBackend;
  storageCanisterId?: string; compact?: boolean; showEmpty?: boolean;
}) {
  const [urls, setUrls] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const listener = (event: Event) => {
      if ((event as CustomEvent<string>).detail === objectId) setReload(value => value + 1);
    };
    window.addEventListener('alltracks:wander-photo-published', listener);
    return () => window.removeEventListener('alltracks:wander-photo-published', listener);
  }, [objectId]);
  useEffect(() => {
    let active = true;
    const created: string[] = [];
    setLoading(true);
    setError('');
    void loadWanderPhotos(objectId, agent, backend, storageCanisterId).then(photos => {
      const next = photos.map(photo => {
        const url = URL.createObjectURL(photo.blob);
        created.push(url);
        return url;
      });
      if (active) { setUrls(next); setError(''); setLoading(false); }
      else next.forEach(url => URL.revokeObjectURL(url));
    }).catch(cause => {
      if (active) {
        setError(cause instanceof Error ? cause.message : String(cause));
        setLoading(false);
      }
    });
    return () => { active = false; created.forEach(url => URL.revokeObjectURL(url)); };
  }, [objectId, agent, backend, storageCanisterId, reload]);
  return <div className={compact ? 'wander-object-photos wander-object-photos--compact' : 'wander-object-photos'}>
    {urls.map((url, index) => <img key={url} src={url} alt={`Object photo ${index + 1}`}
      style={{ maxWidth: compact ? 120 : 420, width: '100%', borderRadius: 12, objectFit: 'cover' }} />)}
    {showEmpty && loading && urls.length === 0 && <p role="status">Loading object photos…</p>}
    {showEmpty && !loading && !error && urls.length === 0 && <p>No published photos yet.</p>}
    {error && <div role="alert">
      <p>Unable to load published object photos: {error}</p>
      <button type="button" onClick={() => setReload(value => value + 1)}>Retry loading photos</button>
    </div>}
  </div>;
}
