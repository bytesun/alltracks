import React, { useEffect, useMemo, useState } from 'react';
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

type TrackingPost = {
  id: string;
  pubkey: string;
  content: string;
  createdAt: number;
  image?: string;
  latitude?: string;
  longitude?: string;
  mapUrl?: string;
  relays: string[];
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
const FEED_LIMIT = 50;

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

const isNostrEvent = (value: unknown): value is NostrEvent => {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<NostrEvent>;
  return typeof event.pubkey === 'string'
    && typeof event.created_at === 'number'
    && typeof event.kind === 'number'
    && Array.isArray(event.tags)
    && typeof event.content === 'string';
};

const getTagValues = (event: NostrEvent, tagName: string) => event.tags
  .filter((tag) => tag[0] === tagName)
  .map((tag) => tag.slice(1));

const getFirstTagValue = (event: NostrEvent, tagName: string) => getTagValues(event, tagName)[0]?.[0];

const isAllTracksEvent = (event: NostrEvent) => {
  const topicTags = getTagValues(event, 't').flat().map((tag) => tag.toLowerCase());
  const client = getFirstTagValue(event, 'client')?.toLowerCase();
  return event.kind === 1 && topicTags.includes('alltracks') && (topicTags.includes('tracking') || client === 'alltracks');
};

const getPostImage = (event: NostrEvent) => {
  const imetaUrl = getTagValues(event, 'imeta')
    .flat()
    .find((value) => value.startsWith('url '))
    ?.replace(/^url\s+/, '');
  if (imetaUrl) return imetaUrl;

  const referenceUrl = getTagValues(event, 'r')
    .flat()
    .find((value) => /^https?:\/\/.+\.(png|jpe?g|gif|webp|avif)(\?.*)?$/i.test(value) || value.startsWith('data:image/'));
  return referenceUrl;
};

const getPostLocation = (event: NostrEvent) => {
  const location = getTagValues(event, 'location')[0];
  if (location?.[0] && location?.[1]) {
    return { latitude: location[0], longitude: location[1] };
  }

  const match = event.content.match(/📍\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (match) {
    return { latitude: match[1], longitude: match[2] };
  }

  return {};
};

const getPostMapUrl = (event: NostrEvent) => getTagValues(event, 'r')
  .flat()
  .find((value) => value.includes('openstreetmap.org'));

const toTrackingPost = (event: NostrEvent, relay: string): TrackingPost => ({
  id: event.id || `${event.pubkey}-${event.created_at}`,
  pubkey: event.pubkey,
  content: event.content,
  createdAt: event.created_at,
  image: getPostImage(event),
  ...getPostLocation(event),
  mapUrl: getPostMapUrl(event),
  relays: [relay],
});

const mergePosts = (posts: TrackingPost[]) => {
  const postMap = new Map<string, TrackingPost>();

  posts.forEach((post) => {
    const existing = postMap.get(post.id);
    if (existing) {
      postMap.set(post.id, {
        ...existing,
        relays: [...new Set([...existing.relays, ...post.relays])],
      });
    } else {
      postMap.set(post.id, post);
    }
  });

  return Array.from(postMap.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, FEED_LIMIT);
};

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
      if (Array.isArray(payload) && payload[0] === 'OK' && payload[1] === event.id) {
        settle(Boolean(payload[2]), String(payload[3] || (payload[2] ? 'Accepted.' : 'Rejected.')));
      }
      if (Array.isArray(payload) && payload[0] === 'NOTICE') {
        settle(false, String(payload[1] || 'Relay returned a notice.'));
      }
    } catch {
      settle(false, 'Relay returned an invalid response.');
    }
  };
});

const fetchPostsFromRelay = (relay: string): Promise<TrackingPost[]> => new Promise((resolve) => {
  const socket = new WebSocket(relay);
  const subscriptionId = `alltracks-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const posts: TrackingPost[] = [];
  let settled = false;

  const settle = () => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timeout);
    try {
      socket.send(JSON.stringify(['CLOSE', subscriptionId]));
    } catch {
      // Socket may already be closed by the relay.
    }
    socket.close();
    resolve(posts);
  };

  const timeout = window.setTimeout(settle, 4500);

  socket.onopen = () => {
    socket.send(JSON.stringify([
      'REQ',
      subscriptionId,
      {
        kinds: [1],
        '#t': ['alltracks'],
        limit: FEED_LIMIT,
      },
    ]));
  };
  socket.onerror = settle;
  socket.onmessage = (message) => {
    try {
      const payload = JSON.parse(message.data);
      if (!Array.isArray(payload)) return;

      if (payload[0] === 'EVENT' && payload[1] === subscriptionId && isNostrEvent(payload[2]) && isAllTracksEvent(payload[2])) {
        posts.push(toTrackingPost(payload[2], relay));
      }

      if (payload[0] === 'EOSE' && payload[1] === subscriptionId) {
        settle();
      }
    } catch {
      // Ignore malformed relay messages and continue collecting from this relay.
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
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [feedPosts, setFeedPosts] = useState<TrackingPost[]>([]);
  const [results, setResults] = useState<PublishResult[]>([]);

  const relays = useMemo(() => normalizeRelays(relayText), [relayText]);
  const hasNostrExtension = typeof window !== 'undefined' && Boolean(window.nostr);
  const selectedImage = photoPreview || photoUrl;

  const fetchLatestPosts = async () => {
    if (relays.length === 0) {
      showNotification('Add at least one public relay to load the feed.', 'error');
      return;
    }

    setIsFeedLoading(true);
    try {
      const relayPosts = await Promise.all(relays.map((relay) => fetchPostsFromRelay(relay)));
      const latestPosts = mergePosts(relayPosts.flat());
      setFeedPosts(latestPosts);
      if (latestPosts.length === 0) {
        showNotification('No AllTracks tracking posts found on the configured relays.', 'info');
      }
    } catch {
      showNotification('Unable to load the latest tracking posts.', 'error');
    } finally {
      setIsFeedLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestPosts();
    // Run once on first load with the default public relays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const resetPostForm = () => {
    setContent('');
    setPhotoUrl('');
    setPhotoPreview('');
    setLatitude('');
    setLongitude('');
    setAccuracy(null);
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
      const acceptedResults = publishResults.filter((result) => result.ok);
      if (acceptedResults.length > 0) {
        showNotification(`Tracking post published to ${acceptedResults.length}/${publishResults.length} relays.`, 'success');
        setFeedPosts((existingPosts) => mergePosts([
          { ...toTrackingPost(event, acceptedResults[0].relay), relays: acceptedResults.map((result) => result.relay) },
          ...existingPosts,
        ]));
        resetPostForm();
        setIsPostModalOpen(false);
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
            Read the latest AllTracks tracking posts and share your own photo, content, and GPS location through public Nostr relays.
          </p>
        </div>
        <div className="tracking-hero-actions">
          <button className="tracking-secondary-button" onClick={fetchLatestPosts} disabled={isFeedLoading}>
            {isFeedLoading ? 'Refreshing…' : 'Refresh Feed'}
          </button>
          <button className="tracking-primary-button" onClick={() => setIsPostModalOpen(true)}>
            Open Post Form
          </button>
        </div>
      </section>

      {results.length > 0 && (
        <section className="tracking-card tracking-results-card">
          <h2>Last publish results</h2>
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

      <section className="tracking-feed-section">
        <div className="tracking-feed-header">
          <div>
            <p className="tracking-eyebrow">Platform feed</p>
            <h2>Latest posts</h2>
          </div>
          <span>{feedPosts.length} post{feedPosts.length === 1 ? '' : 's'}</span>
        </div>

        {isFeedLoading && <div className="tracking-empty-state">Loading latest AllTracks posts from public relays…</div>}

        {!isFeedLoading && feedPosts.length === 0 && (
          <div className="tracking-empty-state">
            No AllTracks tracking posts were found yet. Open the post form to publish the first update.
          </div>
        )}

        <div className="tracking-feed-list">
          {feedPosts.map((post) => (
            <article className="tracking-post-card" key={post.id}>
              <div className="tracking-post-meta">
                <span>{new Date(post.createdAt * 1000).toLocaleString()}</span>
                <span title={post.pubkey}>npub…{post.pubkey.slice(-10)}</span>
              </div>
              <p className="tracking-post-content">{post.content}</p>
              {post.image && (
                <img className="tracking-post-image" src={post.image} alt="Tracking post attachment" loading="lazy" />
              )}
              {(post.latitude && post.longitude) && (
                <div className="tracking-post-location">
                  <span>📍 {post.latitude}, {post.longitude}</span>
                  {post.mapUrl && <a href={post.mapUrl} target="_blank" rel="noreferrer">Open map</a>}
                </div>
              )}
              <div className="tracking-post-relays">
                Seen on {post.relays.length} relay{post.relays.length === 1 ? '' : 's'}: {post.relays.join(', ')}
              </div>
            </article>
          ))}
        </div>
      </section>

      {isPostModalOpen && (
        <div className="tracking-modal-overlay" role="presentation" onClick={() => setIsPostModalOpen(false)}>
          <section
            className="tracking-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tracking-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="tracking-modal-header">
              <div>
                <p className="tracking-eyebrow">Create tracking post</p>
                <h2 id="tracking-modal-title">Post to Nostr</h2>
              </div>
              <button className="tracking-close-button" onClick={() => setIsPostModalOpen(false)} aria-label="Close tracking post form">
                ×
              </button>
            </div>

            {!hasNostrExtension && (
              <div className="tracking-alert">
                A Nostr browser signer such as Alby, nos2x, or another NIP-07 extension is required to sign and publish events.
              </div>
            )}

            {pubkey && <div className="tracking-pubkey">Public key: {pubkey}</div>}

            <div className="tracking-card tracking-form-card">
              <button className="tracking-secondary-button" onClick={connectNostr} disabled={!hasNostrExtension}>
                {pubkey ? 'Signer Connected' : 'Connect Nostr Signer'}
              </button>

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
                <button className="tracking-secondary-button" onClick={() => setIsPostModalOpen(false)} disabled={isPublishing}>
                  Cancel
                </button>
                <button className="tracking-primary-button" onClick={publishTrackingPost} disabled={isPublishing || !pubkey}>
                  {isPublishing ? 'Publishing…' : `Publish to ${relays.length} Relay${relays.length === 1 ? '' : 's'}`}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
};

export default Tracking;
