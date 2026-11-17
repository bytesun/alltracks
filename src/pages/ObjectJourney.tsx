import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './ObjectJourney.css';
import { useAlltracks, useComment, useGlobalContext, useSetLoginModal } from '../components/Store';
import { getObject, loadObjectCheckins, type JourneyCheckin, type ObjectRecord } from '../api/object-journey/objects';
import { GuestTurnstile } from '../components/GuestTurnstile';
import { CheckinPhoto } from '../components/CheckinPhoto';
import { CHECKIN_OUTBOX_EVENT, isOffline, listPendingCheckins, markPendingError,
  queueObjectCheckin, type PendingObjectCheckin } from '../lib/offlineCheckins';
import { flushSignedInCheckins, syncOneGuestCheckin } from '../lib/checkinSync';

type Action = 'found' | 'carried' | 'left';
type Checkin = JourneyCheckin;
type LocationPreview = { latitude: number; longitude: number; accuracyMeters: number };

const ACTIONS: Record<Action, { title: string; icon: string }> = {
  found: { title: 'I found it', icon: '👀' },
  carried: { title: 'I brought it here', icon: '🥾' },
  left: { title: 'I left it for the next explorer', icon: '📍' },
};
const formatDate = (value: string) => new Date(value).toLocaleString();
const toRadians = (value: number) => value * Math.PI / 180;
const distanceKm = (a: Checkin, b: Checkin) => {
  const latDelta = toRadians(b.latitude - a.latitude);
  const lonDelta = toRadians(b.longitude - a.longitude);
  const h = Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(lonDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export function ObjectJourney() {
  const { objectId = '' } = useParams<'objectId'>();
  const backend = useAlltracks();
  const comments = useComment();
  const { state: { isAuthed, principal } } = useGlobalContext();
  const [, setLoginModal] = useSetLoginModal();
  const [object, setObject] = useState<ObjectRecord | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [location, setLocation] = useState<LocationPreview | null>(null);
  const [locating, setLocating] = useState(false);
  const [action, setAction] = useState<Action>('carried');
  const [note, setNote] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [consented, setConsented] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [guestConfig, setGuestConfig] = useState<{
    enabled: boolean; siteKey: string | null; gatewayPrincipal: string | null;
  }>({
    enabled: false, siteKey: null, gatewayPrincipal: null,
  });
  const [guestToken, setGuestToken] = useState('');
  const [guestReset, setGuestReset] = useState(0);
  const [online, setOnline] = useState(() => !isOffline());
  const [pendingForObject, setPendingForObject] = useState<PendingObjectCheckin[]>([]);
  const [retryClock, setRetryClock] = useState(() => Date.now());
  const guestSyncing = useRef(false);
  const guestMode = !isAuthed && guestConfig.enabled && Boolean(guestConfig.siteKey) && Boolean(guestConfig.gatewayPrincipal);
  const canCheckin = isAuthed || guestMode || !online;

  useEffect(() => {
    const update = () => setOnline(!isOffline());
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const load = () => {
      void listPendingCheckins().then(items => {
        if (active) {
          setPendingForObject(items.filter((item): item is PendingObjectCheckin =>
            item.kind === 'object' && item.objectId === objectId));
        }
      }).catch(() => {});
    };
    load();
    window.addEventListener(CHECKIN_OUTBOX_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(CHECKIN_OUTBOX_EVENT, load);
    };
  }, [objectId]);

  useEffect(() => {
    if (!online) return;
    const controller = new AbortController();
    // A gateway being live is NOT enough: each owner must opt in for the
    // specific object using its exact registered public relay Principal.
    void (async () => {
      try {
        const response = await fetch('/api/objects/guest-config', {
          cache: 'no-store', signal: controller.signal,
        });
        if (!response.ok) return;
        const config = await response.json() as {
          enabled?: boolean; siteKey?: string | null; gatewayPrincipal?: string | null;
        };
        if (!config.enabled || !config.siteKey || !config.gatewayPrincipal) return;
        const policy = await backend.getObjectGuestPolicy(objectId);
        if (controller.signal.aborted || !policy.length) return;
        if (policy[0].enabled && policy[0].gateway.toText() === config.gatewayPrincipal) {
          setGuestConfig({
            enabled: true,
            siteKey: config.siteKey,
            gatewayPrincipal: config.gatewayPrincipal,
          });
        }
      } catch {
        // Production canister may not yet have the guest methods.
        // Keep the existing login-based route available instead.
      }
    })();
    return () => controller.abort();
  }, [objectId, backend, online]);

  const refresh = async () => {
    try {
      const item = await getObject(backend, objectId);
      if (!item) throw new Error('Object not found or not public.');
      const stops = await loadObjectCheckins(backend, objectId);
      setObject(item);
      setCheckins(stops);
      setLoadError('');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load journey.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // Refresh when a new physical object's QR URL is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectId, backend]);

  const chronological = useMemo(() => [...checkins].reverse(), [checkins]);
  const positions = chronological.map((entry): [number, number] => [entry.latitude, entry.longitude]);
  const center: [number, number] = positions.length ? positions[positions.length - 1] : [49.17, -122.65];
  const straightLineKm = chronological.slice(1).reduce(
    (sum, entry, index) => sum + distanceKm(chronological[index], entry), 0,
  );

  const locate = () => {
    setMessage('');
    if (!navigator.geolocation) {
      setMessage('This browser does not support GPS. Please use a phone with location access.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
        });
        setLocating(false);
      },
      () => {
        setLocating(false);
        setMessage('GPS unavailable or permission denied. Enable location in your browser and try again.');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  };

  useEffect(() => {
    if (!online || !guestMode || !pendingForObject.length) return;
    const interval = window.setInterval(() => setRetryClock(Date.now()), 10_000);
    return () => window.clearInterval(interval);
  }, [online, guestMode, pendingForObject.length]);

  // A freshly generated Turnstile token is single-use. Once connectivity is
  // restored, a pending guest check-in syncs when a new challenge succeeds.
  // Turnstile may require human interaction; it cannot be bypassed offline.
  const nextGuest = !isAuthed && guestMode
    ? pendingForObject.find(item =>
      item.principal === null && (!item.nextAttemptAt || item.nextAttemptAt <= retryClock))
    : undefined;
  useEffect(() => {
    if (!online || !nextGuest || !guestToken || guestSyncing.current) return;
    guestSyncing.current = true;
    const pending = nextGuest;
    const token = guestToken;
    void (async () => {
      try {
        await syncOneGuestCheckin(pending, token);
        setMessage('Saved check-in synced to ICP.');
        await refresh();
      } catch (error) {
        await markPendingError(pending.id, error);
        setMessage('Your check-in is still saved on this device. Verification or connectivity may be needed.');
      } finally {
        setGuestToken('');
        setGuestReset(v => v + 1);
        guestSyncing.current = false;
      }
    })();
    // Do not retry until the widget supplies a fresh token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, nextGuest?.id, guestToken, guestMode]);

  const submit = async () => {
    if (!location || !consented || sending || !canCheckin ||
        (online && Boolean(loadError))) return;
    if (isAuthed && !principal) {
      setMessage('Your login is still loading. Try again after your account appears.');
      return;
    }
    setSending(true);
    setMessage('');
    try {
      // Queue FIRST, whether online or offline. A failed ICP write never
      // destroys the visitor's consented note or rounded GPS position.
      const queued = await queueObjectCheckin({
        kind: 'object',
        objectId,
        principal: isAuthed ? principal!.toText() : null,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracyMeters: location.accuracyMeters,
        action,
        note,
        photoUrl,
      });
      setLocation(null);
      setNote('');
      setPhotoUrl('');
      setConsented(false);
      setMessage('Check-in saved on this device. It will sync when connectivity and authorization are available.');
      if (!isOffline() && isAuthed && principal) {
        await flushSignedInCheckins(backend, comments, principal.toText(), true);
        const items = await listPendingCheckins();
        if (!items.some(item => item.id === queued.id)) {
          setMessage('Check-in synced to ICP.');
          await refresh();
        }
      }
      // Guest queued items trigger automatic upload when Turnstile issues a
      // fresh online token; the page never stores or reuses an old token.
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save this check-in locally.');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="journey-page">
      <section className="journey-hero">
        <div className="journey-overline">ALLTRACKS · OBJECT JOURNEY</div>
        <div className="journey-cup">{object?.emoji || '📦'}</div>
        <h1>{object?.name || 'Track Me Down'}</h1>
        <p className="journey-intro">{object?.description || 'Found this object? Help it travel and share where it has been.'}</p>
        <span className="journey-id">Object ID · {objectId}</span>
        <p className="journey-zh">扫码查看物品旅程。登录后可自愿添加一次位置；不会持续追踪你。 <Link to="/objects" style={{ color: 'white' }}>Create your own object</Link></p>
      </section>

      <section className="journey-stats" aria-label="Journey statistics">
        <div><strong>{checkins.length}</strong><span>Check-ins</span></div>
        <div><strong>{straightLineKm.toFixed(1)} km</strong><span>Between reported stops*</span></div>
        <div><strong>{checkins.length ? formatDate(checkins[0].createdAt).split(',')[0] : '—'}</strong><span>Last spotted</span></div>
      </section>

      <section className="journey-panel journey-checkin">
        <div className="journey-section-title"><h2>Join the adventure</h2><span>01 / CHECK IN</span></div>
        {!online && <p className="journey-login-notice" role="status">
          📴 Offline. Save your check-in on this device now; the app will retry after reconnecting.
          Keep this page available if it has not been installed for offline use.
        </p>}
        {pendingForObject.length > 0 && <p className="journey-login-notice" role="status">
          {pendingForObject.length} local check-in{pendingForObject.length === 1 ? '' : 's'} waiting for sync.
          Guest entries will need a fresh human-verification token when online.
        </p>}
        {!isAuthed && !guestMode && online && <p className="journey-login-notice">
          Guest check-in is not enabled for this deployment. Sign in to add a location.
          <button type="button" onClick={() => setLoginModal(true)}>Sign in to check in</button>
        </p>}
        {guestMode && <p className="journey-login-notice">
          No account required. Your location is shared only after you grant GPS permission,
          pass anti-spam verification, and consent to publishing an approximate point.
        </p>}
        <p>You choose whether to share a location. Only an approximate point (rounded to ~100 m),
          a note, and a timestamp are saved on the existing AllTracks ICP canister.
          {isAuthed ? ' Signed-in checkpoints are associated with your account Principal.' : ' Guest submissions will be attributed to the service gateway, not a user login.'}
        </p>
        <label htmlFor="journey-action">What happened?</label>
        <select id="journey-action" value={action} onChange={(event) => setAction(event.target.value as Action)}>
          {Object.entries(ACTIONS).map(([value, details]) => (
            <option value={value} key={value}>{details.icon} {details.title}</option>
          ))}
        </select>
        <label htmlFor="journey-note">A note for the next explorer (optional)</label>
        <textarea
          id="journey-note" maxLength={280} rows={3}
          placeholder="A rainy morning on the trail..."
          value={note} onChange={(event) => setNote(event.target.value)}
        />
        <label htmlFor="journey-photo-url">Photo URL (optional)</label>
        <input
          id="journey-photo-url" type="url" inputMode="url" maxLength={220}
          placeholder="https://example.com/photo.jpg"
          value={photoUrl}
          onChange={(event) => setPhotoUrl(event.target.value)}
        />
        <p className="journey-photo-hint">Use a public HTTPS image link. It will be visible to everyone.
          On guest check-ins, the note and link together must fit in 280 characters.</p>
        <button className="journey-button journey-button-soft" type="button" onClick={locate} disabled={locating || (online && Boolean(loadError)) || !canCheckin}>
          {locating ? 'Finding your GPS location…' : location ? '↻ Refresh my location' : '◎ Get my GPS location'}
        </button>
        {location && (
          <div className="journey-location-preview">
            <strong>Location ready</strong>
            <span>Approximate public point: {location.latitude.toFixed(3)}, {location.longitude.toFixed(3)}</span>
            <small>Device-reported accuracy: ±{Math.round(location.accuracyMeters)} m. Exact coordinates are not stored.</small>
          </div>
        )}
        <label className="journey-consent">
          <input type="checkbox" checked={consented} onChange={(event) => setConsented(event.target.checked)} />
          <span>I agree to publish this approximate location, note and optional photo link on the public journey map.</span>
        </label>
        {guestMode && guestConfig.siteKey && <GuestTurnstile
          siteKey={guestConfig.siteKey} onToken={setGuestToken} resetSignal={guestReset}
        />}
        <button className="journey-button" type="button" onClick={submit}
          disabled={!location || !consented || !canCheckin || sending || (online && Boolean(loadError))}>
          {sending ? 'Saving check-in…' : online ? 'Save and sync this stop' : 'Save check-in offline'}
        </button>
        {message && <p className="journey-message" role="status">{message}</p>}
        {loadError && <p className="journey-error" role="alert">{loadError}</p>}
      </section>

      <section className="journey-panel">
        <div className="journey-section-title"><h2>Journey map</h2><span>02 / MAP</span></div>
        <div className="journey-map">
          <MapContainer key={checkins[0]?.id || 'empty'} center={center} zoom={positions.length ? 11 : 8} scrollWheelZoom={false} style={{ height: 350, width: '100%' }}>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {positions.length > 1 && <Polyline positions={positions} pathOptions={{ color: '#355e48', weight: 3, dashArray: '7 7' }} />}
            {chronological.map((entry, index) => (
              <CircleMarker key={entry.id} center={[entry.latitude, entry.longitude]} radius={index === chronological.length - 1 ? 9 : 6}
                pathOptions={{ color: '#234c37', fillColor: '#a2d4a3', fillOpacity: 1, weight: 2 }}>
                <Popup><strong>{ACTIONS[entry.action]?.title || 'Cup spotted'}</strong><p>{formatDate(entry.createdAt)}</p>{entry.note && <p>{entry.note}</p>}{entry.photoUrl && <CheckinPhoto url={entry.photoUrl} label="Check-in photo" />}</Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
        <p className="journey-map-note">* Dashed connections join voluntary check-in points, not the actual route traveled. Anyone with the QR link can see this approximate public map.</p>
        {loading && <p>Loading the journey…</p>}
        {!loading && checkins.length === 0 && !loadError && <p>No stops yet. Be the first explorer to check in!</p>}
        <div className="journey-timeline">
          {checkins.map((entry) => (
            <article className="journey-stop" key={entry.id}>
              <span className="journey-stop-icon">{ACTIONS[entry.action]?.icon || '📍'}</span>
              <div><strong>{ACTIONS[entry.action]?.title || 'Cup spotted'}</strong>
                <small>{formatDate(entry.createdAt)} · {entry.latitude.toFixed(3)}, {entry.longitude.toFixed(3)}</small>
                {entry.note && <p>{entry.note}</p>}
                {entry.photoUrl && <CheckinPhoto url={entry.photoUrl} label="Photo from this check-in" />}
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="journey-footer">Keep trails clean and respect park rules. Never take another person's property.
        QR codes are links, not live trackers. Signed-in checkpoint authors may be identifiable
        by their public ICP Principal; guest reports are not proof of physical custody.
        Do not publish sensitive locations.</footer>
    </main>
  );
}
