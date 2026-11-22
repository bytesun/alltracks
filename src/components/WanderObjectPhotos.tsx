import { useEffect, useState } from 'react';
import type { HttpAgent } from '@dfinity/agent';
import { loadWanderPhotos, type WanderPhotoLifecycleBackend } from '../lib/wanderPhotoLifecycle';

/** Object's published ICEStorage photos, without a separate Journey Photos editor. */
export function WanderObjectPhotos({ objectId, agent, backend, storageCanisterId, compact = false }: {
  objectId: string; agent: HttpAgent; backend: WanderPhotoLifecycleBackend;
  storageCanisterId?: string; compact?: boolean;
}) {
  const [urls, setUrls] = useState<string[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const created: string[] = [];
    void loadWanderPhotos(objectId, agent, backend, storageCanisterId).then(photos => {
      const next = photos.map(photo => {
        const url = URL.createObjectURL(photo.blob);
        created.push(url);
        return url;
      });
      if (active) { setUrls(next); setError(''); }
      else next.forEach(url => URL.revokeObjectURL(url));
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : String(cause)); });
    return () => { active = false; created.forEach(url => URL.revokeObjectURL(url)); };
  }, [objectId, agent, backend, storageCanisterId]);
  return <div className={compact ? 'wander-object-photos wander-object-photos--compact' : 'wander-object-photos'}>
    {urls.map((url, index) => <img key={url} src={url} alt={`Object photo ${index + 1}`}
      style={{ maxWidth: compact ? 120 : 420, width: '100%', borderRadius: 12, objectFit: 'cover' }} />)}
    {error && <p role="alert">Unable to load stored photo: {error}</p>}
  </div>;
}
