import { useState } from 'react';
import { normalizeCheckinPhotoUrl } from '../lib/checkinPhoto';

export function CheckinPhoto({ url, label = 'Check-in photo' }: {
  url: string;
  label?: string;
}) {
  const [failed, setFailed] = useState(false);
  let source = '';
  try {
    source = normalizeCheckinPhotoUrl(url);
  } catch {
    return null;
  }
  if (!source) return null;

  return (
    <figure className="checkin-photo">
      {!failed && (
        <a href={source} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
          aria-label="Open full check-in photo">
          <img
            src={source}
            alt={label}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
          />
        </a>
      )}
      <figcaption>
        <a href={source} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
          {failed ? 'View photo link (preview unavailable)' : 'View full photo'}
        </a>
      </figcaption>
    </figure>
  );
}
