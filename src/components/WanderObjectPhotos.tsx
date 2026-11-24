import { useEffect, useRef, useState } from 'react';
import type { HttpAgent } from '@dfinity/agent';
import { loadWanderPhotos, type WanderPhotoLifecycleBackend } from '../lib/wanderPhotoLifecycle';
import { normalizeCheckinPhotoUrl } from '../lib/checkinPhoto';
import './WanderObjectPhotos.css';

type Photo = { id: string; url: string };

/** Public object photos from ICEStorage and existing creator-supplied links. */
export function WanderObjectPhotos({ objectId, agent, backend, storageCanisterId, compact = false,
  showEmpty = false, legacyPhotoUrl = '', name = 'Object' }: {
  objectId: string; agent: HttpAgent; backend: WanderPhotoLifecycleBackend;
  storageCanisterId?: string; compact?: boolean; showEmpty?: boolean;
  legacyPhotoUrl?: string; name?: string;
}) {
  const [published, setPublished] = useState<{ objectId: string; photos: Photo[] }>({ objectId, photos: [] });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

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
    // The previous effect revokes its object URLs; do not display them while reloading.
    setPublished({ objectId, photos: [] });
    setLoading(true);
    setError('');
    void loadWanderPhotos(objectId, agent, backend, storageCanisterId).then(photos => {
      if (!active) return;
      const next = photos.map(photo => {
        const url = URL.createObjectURL(photo.blob);
        created.push(url);
        return { id: 'storage:' + photo.storageObjectId, url };
      });
      setPublished({ objectId, photos: next });
      setLoading(false);
    }).catch(cause => {
      if (active) {
        setError(cause instanceof Error ? cause.message : String(cause));
        setLoading(false);
      }
    });
    return () => { active = false; created.forEach(url => URL.revokeObjectURL(url)); };
  }, [objectId, agent, backend, storageCanisterId, reload]);

  let legacy = '';
  try { legacy = normalizeCheckinPhotoUrl(legacyPhotoUrl); } catch { /* Ignore unsafe legacy links. */ }
  const photos: Photo[] = [
    ...(legacy ? [{ id: 'legacy:' + legacy, url: legacy }] : []),
    ...(published.objectId === objectId ? published.photos : []),
  ];
  const index = Math.max(0, photos.findIndex(photo => photo.id === selectedId));
  const current = photos[index];
  const multiple = photos.length > 1;
  const move = (delta: number) => {
    if (multiple) setSelectedId(photos[(index + delta + photos.length) % photos.length].id);
  };

  return <div className={compact ? 'wander-object-photos wander-object-photos--compact' : 'wander-object-photos'}>
    {current && <div className="wander-photo-carousel" role="region" aria-roledescription="carousel"
      aria-label={name + ' photos'}
      onKeyDown={event => {
        if (!multiple || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
        event.preventDefault();
        move(event.key === 'ArrowLeft' ? -1 : 1);
      }}>
      <div className="wander-photo-stage"
        onTouchStart={event => {
          const touch = event.touches[0];
          touchStart.current = event.touches.length === 1 && touch ? { x: touch.clientX, y: touch.clientY } : null;
        }}
        onTouchCancel={() => { touchStart.current = null; }}
        onTouchEnd={event => {
          const start = touchStart.current;
          touchStart.current = null;
          const end = event.changedTouches[0];
          if (!start || !end) return;
          const dx = end.clientX - start.x;
          const dy = end.clientY - start.y;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) move(dx < 0 ? 1 : -1);
        }}>
        <a className="wander-photo-original" href={current.url} target="_blank" rel="noopener noreferrer"
          referrerPolicy="no-referrer" aria-label={`Open original photo ${index + 1} of ${name} (new tab)`}>
          {failedUrl === current.url
            ? <span className="wander-photo-unavailable">Preview unavailable · Open original</span>
            : <img key={current.url} src={current.url} alt={`${name} · photo ${index + 1}`}
                decoding="async" referrerPolicy="no-referrer" draggable={false}
                onError={() => setFailedUrl(current.url)} />}
        </a>
        {multiple && <>
          <button className="wander-photo-arrow wander-photo-arrow--prev" type="button"
            aria-label="Previous photo" onClick={() => move(-1)}>‹</button>
          <button className="wander-photo-arrow wander-photo-arrow--next" type="button"
            aria-label="Next photo" onClick={() => move(1)}>›</button>
        </>}
        {multiple && <span className="wander-photo-count" aria-live="polite" aria-atomic="true">
          {index + 1} / {photos.length}
        </span>}
      </div>
      {!compact && <div className="wander-photo-caption">
        <span>{multiple ? 'Swipe or use arrows to browse' : 'Object photo'}</span>
        <a href={current.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">View original ↗</a>
      </div>}
    </div>}
    {showEmpty && loading && photos.length === 0 && <p role="status">Loading object photos…</p>}
    {showEmpty && !loading && !error && photos.length === 0 && <p>No published photos yet.</p>}
    {error && <div role="alert" className="wander-photo-error">
      <p>Unable to load published object photos: {error}</p>
      <button type="button" onClick={() => setReload(value => value + 1)}>Retry loading photos</button>
    </div>}
  </div>;
}
