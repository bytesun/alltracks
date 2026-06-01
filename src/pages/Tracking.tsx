import React, { useMemo, useState } from 'react';
import './Tracking.css';
import { useNotification } from '../context/NotificationContext';

type NostrEvent = {
  id?: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig?: string;
};

type NostrProvider = {
  getPublicKey: () => Promise<string>;
  signEvent: (event: NostrEvent) => Promise<NostrEvent>;
};

type PublishResult = {
  relay: string;
  ok: boolean;
  message: string;
};

declare global {
  interface Window {
    nostr?: NostrProvider;
  }
}

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.snort.social',
  'wss://nostr.wine',
];

const GEOHASH_BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

const toHex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer))
  .map((byte) => byte.toString(16).padStart(2, '0'))
  .join('');

const getEventHash = async (event: NostrEvent) => {
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);
  const encoded = new TextEncoder().encode(serialized);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return toHex(digest);
};

const encodeGeohash = (latitude: number, longitude: number, precision = 9) => {
  let evenBit = true;
  let bit = 0;
  let ch = 0;
  let geohash = '';
  const latRange = [-90, 90];
  const lonRange = [-180, 180];

  while (geohash.length < precision) {
    if (evenBit) {
      const mid = (lonRange[0] + lonRange[1]) / 2;
      if (longitude >= mid) {
        ch = (ch << 1) + 1;
        lonRange[0] = mid;
      } else {
        ch <<= 1;
        lonRange[1] = mid;
      }
    } else {
      const mid = (latRange[0] + latRange[1]) / 2;
      if (latitude >= mid) {
        ch = (ch << 1) + 1;
        latRange[0] = mid;
      } else {
        ch <<= 1;
        latRange[1] = mid;
      }
    }

    evenBit = !evenBit;
    if (++bit === 5) {
      geohash += GEOHASH_BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }

  return geohash;
};

const normalizeRelays = (relayText: string) => relayText
  .split(/\s|,/)
  .map((relay) => relay.trim())
  .filter(Boolean)
  .filter((relay, index, relays) => relays.indexOf(relay) === index);

const publishToRelay = (relay: string, event: NostrEvent): Promise<PublishResult> => new Promise((resolve) => {
  let settled = false;
  const socket = new WebSocket(relay);
  const timeout = window.setTimeout(() => {
    if (!settled) {
      settled = true;
      socket.close();
      resolve({ relay, ok: false, message: 'Timed out waiting for relay acknowledgement.' });
    }
  }, 10000);

  const settle = (ok: boolean, message: string) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timeout);
    socket.close();
    resolve({ relay, ok, message });
  };

  socket.onopen = () => socket.send(JSON.stringify(['EVENT', event]));
  socket.onerror = () => settle(false, 'Connection failed.');
  socket.onmessage = (message) => {
    try {
      const payload = JSON.parse(message.data);
      if (payload[0] === 'OK' && payload[1] === event.id) {
        settle(Boolean(payload[2]), payload[3] || (payload[2] ? 'Accepted.' : 'Rejected.'));
      }
      if (payload[0] === 'NOTICE') {
        settle(false, payload[1] || 'Relay returned a notice.');
      }
    } catch {
      settle(false, 'Relay returned an invalid response.');
    }
  };
});

export const Tracking = () => {
  const { showNotification } = useNotification();
  const [content, setContent] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [relayText, setRelayText] = useState(DEFAULT_RELAYS.join('\n'));
  const [pubkey, setPubkey] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [results, setResults] = useState<PublishResult[]>([]);

  const relays = useMemo(() => normalizeRelays(relayText), [relayText]);
  const hasNostrExtension = typeof window !== 'undefined' && Boolean(window.nostr);
  const selectedImage = photoPreview || photoUrl;

  const connectNostr = async () => {
    if (!window.nostr) {
      showNotification('Install or enable a Nostr browser extension that supports NIP-07 signing.', 'error');
      return;
    }

    try {
      const publicKey = await window.nostr.getPublicKey();
      setPubkey(publicKey);
      showNotification('Nostr signer connected.', 'success');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      showNotification(`Could not connect Nostr signer: ${message}`, 'error');
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      showNotification('Geolocation is not available in this browser.', 'error');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setAccuracy(position.coords.accuracy);
        setIsLocating(false);
        showNotification('GPS location added to your tracking post.', 'success');
      },
      (error) => {
        setIsLocating(false);
        showNotification(`Unable to get GPS location: ${error.message}`, 'error');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  };

  const handlePhotoFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 250000) {
      showNotification('Large files are often rejected by public relays. Use a hosted photo URL for best results.', 'error');
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      setPhotoPreview(result);
      setPhotoUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const buildEvent = async () => {
    if (!window.nostr) throw new Error('No Nostr signer found.');
    if (!pubkey) throw new Error('Connect your Nostr signer first.');

    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      throw new Error('Add a valid GPS latitude and longitude before publishing.');
    }

    const trimmedContent = content.trim();
    if (!trimmedContent && !photoUrl.trim()) {
      throw new Error('Write content or add a photo before publishing.');
    }

    const mapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;
    const image = photoUrl.trim();
    const geohash = encodeGeohash(lat, lon);
    const eventContent = [
      trimmedContent,
      image,
      `📍 ${lat.toFixed(6)}, ${lon.toFixed(6)}`,
      mapUrl,
    ].filter(Boolean).join('\n\n');

    const tags = [
      ['client', 'AllTracks'],
      ['t', 'alltracks'],
      ['t', 'tracking'],
      ['g', geohash],
      ['location', lat.toFixed(6), lon.toFixed(6)],
      ['r', mapUrl],
      ['alt', 'AllTracks GPS tracking post with location metadata'],
    ];

    if (image) {
      tags.push(['r', image]);
      tags.push(['imeta', `url ${image}`]);
    }

    const unsignedEvent: NostrEvent = {
      pubkey,
      created_at: Math.floor(Date.now() / 1000),
      kind: 1,
      tags,
      content: eventContent,
    };

    unsignedEvent.id = await getEventHash(unsignedEvent);
    const signedEvent = await window.nostr.signEvent(unsignedEvent);
    return { ...signedEvent, id: signedEvent.id || unsignedEvent.id };
  };

  const publishTrackingPost = async () => {
    if (relays.length === 0) {
      showNotification('Add at least one public relay.', 'error');
      return;
    }

    setIsPublishing(true);
    setResults([]);
    try {
      const event = await buildEvent();
      const publishResults = await Promise.all(relays.map((relay) => publishToRelay(relay, event)));
      setResults(publishResults);
      const accepted = publishResults.filter((result) => result.ok).length;
      if (accepted > 0) {
        showNotification(`Tracking post published to ${accepted}/${publishResults.length} relays.`, 'success');
        setContent('');
      } else {
        showNotification('No relays accepted the tracking post.', 'error');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to publish tracking post.';
      showNotification(message, 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <main className="tracking-page">
      <section className="tracking-hero">
        <div>
          <p className="tracking-eyebrow">Nostr GPS publishing</p>
          <h1>Tracking</h1>
          <p>
            Share an AllTracks update with content, a photo reference, and GPS coordinates to multiple public Nostr relays.
          </p>
        </div>
        <button className="tracking-secondary-button" onClick={connectNostr} disabled={!hasNostrExtension}>
          {pubkey ? 'Signer Connected' : 'Connect Nostr Signer'}
        </button>
      </section>

      {!hasNostrExtension && (
        <div className="tracking-alert">
          A Nostr browser signer such as Alby, nos2x, or another NIP-07 extension is required to sign and publish events.
        </div>
      )}

      {pubkey && <div className="tracking-pubkey">Public key: {pubkey}</div>}

      <section className="tracking-card">
        <label htmlFor="tracking-content">Content</label>
        <textarea
          id="tracking-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={5}
          placeholder="What are you seeing on your track?"
        />

        <div className="tracking-grid">
          <div>
            <label htmlFor="tracking-photo-url">Photo URL</label>
            <input
              id="tracking-photo-url"
              type="url"
              value={photoUrl}
              onChange={(event) => {
                setPhotoUrl(event.target.value);
                setPhotoPreview('');
              }}
              placeholder="https://example.com/photo.jpg"
            />
            <small>Public relays store Nostr events, not media files. A hosted image URL is recommended.</small>
          </div>
          <div>
            <label htmlFor="tracking-photo-file">Or attach a small photo as a data URI</label>
            <input id="tracking-photo-file" type="file" accept="image/*" onChange={handlePhotoFile} />
            <small>Use small images only; many relays reject large events.</small>
          </div>
        </div>

        {selectedImage && (
          <div className="tracking-preview">
            <img src={selectedImage} alt="Selected tracking attachment preview" />
          </div>
        )}

        <div className="tracking-location-row">
          <div>
            <label htmlFor="tracking-latitude">Latitude</label>
            <input
              id="tracking-latitude"
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              placeholder="49.282700"
            />
          </div>
          <div>
            <label htmlFor="tracking-longitude">Longitude</label>
            <input
              id="tracking-longitude"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              placeholder="-123.120700"
            />
          </div>
          <button className="tracking-secondary-button" onClick={getCurrentLocation} disabled={isLocating}>
            {isLocating ? 'Getting GPS…' : 'Use Current GPS'}
          </button>
        </div>
        {accuracy !== null && <p className="tracking-accuracy">GPS accuracy: about {Math.round(accuracy)} meters.</p>}

        <label htmlFor="tracking-relays">Public relays</label>
        <textarea
          id="tracking-relays"
          value={relayText}
          onChange={(event) => setRelayText(event.target.value)}
          rows={5}
        />
        <small>Separate relay URLs with commas, spaces, or new lines. Publishing will fan out to every relay listed.</small>

        <div className="tracking-actions">
          <button className="tracking-primary-button" onClick={publishTrackingPost} disabled={isPublishing || !pubkey}>
            {isPublishing ? 'Publishing…' : `Publish to ${relays.length} Relay${relays.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </section>

      {results.length > 0 && (
        <section className="tracking-card">
          <h2>Relay results</h2>
          <ul className="tracking-results">
            {results.map((result) => (
              <li key={result.relay} className={result.ok ? 'tracking-result-ok' : 'tracking-result-error'}>
                <strong>{result.ok ? 'Accepted' : 'Rejected'}</strong>
                <span>{result.relay}</span>
                <small>{result.message}</small>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
};

export default Tracking;
