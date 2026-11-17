import { useState } from 'react';
import { normalizeCheckinPhotoUrl } from '../lib/checkinPhoto';

/** Public image referenced by the creator, not uploaded to AllTracks.
 * Never show arbitrary URL schemes or forward referrer information. */
export function ObjectPhoto({
  url, name, compact = false,
}: { url: string; name: string; compact?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  let source = '';
  try { source = normalizeCheckinPhotoUrl(url); }
  catch { return null; }
  if (!source) return null;
  return (
    <figure className={'journey-object-photo' + (compact ? ' journey-object-photo--compact' : '')}>
      {failedUrl !== source && (
        <a href={source} target="_blank" rel="noopener noreferrer"
          referrerPolicy="no-referrer" aria-label={'Open original photo of ' + name}>
          <img src={source} alt={'Photo of ' + name} loading="lazy"
            decoding="async" referrerPolicy="no-referrer"
            onError={() => setFailedUrl(source)} />
        </a>
      )}
      <figcaption>
        <a href={source} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
          {failedUrl === source ? 'Photo preview unavailable — open photo link' : 'View original photo'}
        </a>
      </figcaption>
    </figure>
  );
}
