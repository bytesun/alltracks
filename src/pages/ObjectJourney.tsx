import { useEffect, useMemo, useRef, useState } from 'react';
import { classifyRequestFailure } from '../lib/requestFailure';
import { Link, useParams } from 'react-router-dom';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import type { CircleMarker as LeafletCircleMarker } from 'leaflet';
import { Principal } from '@dfinity/principal';
import 'leaflet/dist/leaflet.css';
import './ObjectJourney.css';
import { useAlltracks, useComment, useGlobalContext, useSetLoginModal } from '../components/Store';
import { getObject, loadObjectCheckins, type JourneyCheckin, type ObjectRecord } from '../api/object-journey/objects';
import { GuestTurnstile } from '../components/GuestTurnstile';
import { CheckinPhoto } from '../components/CheckinPhoto';
import { ObjectPhoto } from '../components/ObjectPhoto';
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
/** Move the existing Leaflet map without remounting it when a visitor
 * selects a Check-in from the journey timeline. */
function JourneyMapFocus({ selected }: { selected: Checkin | null }) {
  const map = useMap();
  useEffect(() => {
    if (!selected) return;
    const position: [number, number] = [selected.latitude, selected.longitude];
    const zoom = Math.max(map.getZoom(), 13);
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) map.setView(position, zoom);
    else map.flyTo(position, zoom, { duration: 0.65 });
  }, [map, selected?.id, selected?.latitude, selected?.longitude]);
  return null;
}

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
  // Null means an older canister or an unavailable policy read: do not fake a setting.
  const [commentsEnabled, setCommentsEnabled] = useState<boolean | null>(null);
  const [changingComments, setChangingComments] = useState(false);
  const [deletingCheckpointId, setDeletingCheckpointId] = useState<string | null>(null);
  const [selectedCheckinId, setSelectedCheckinId] = useState<string | null>(null);
  const mapSectionRef = useRef<HTMLElement | null>(null);
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const checkinDialogRef = useRef<HTMLDialogElement | null>(null);
  const checkinTriggerRef = useRef<HTMLButtonElement | null>(null);
  const mapMarkersRef = useRef(new Map<string, LeafletCircleMarker>());
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
  const isOwner = Boolean(isAuthed && principal && object && principal.toText() === object.owner);

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
      // Feature detection keeps older deployed canisters usable for ordinary
      // check-ins, without claiming comment controls are already active.
      try {
        const policy = await backend.getObjectCommentsEnabled(objectId);
        setCommentsEnabled(policy.length ? policy[0] : null);
      } catch {
        setCommentsEnabled(null);
      }
      setLoadError('');
    } catch (error) {
      const category = classifyRequestFailure(error);
      setLoadError(category === 'authentication'
        ? 'Your session may have expired. Sign in again to refresh this journey.'
        : category === 'network'
          ? 'Connection unavailable. Previously loaded journey data is preserved; retry when online.'
          : error instanceof Error ? error.message : 'Unable to load journey.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // Refresh when a new physical object's QR URL is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectId, backend]);

  // Native modal dialog traps focus and Escape dismisses the check-in form.
  useEffect(() => {
    if (!checkinDialogOpen) return;
    const dialog = checkinDialogRef.current;
    if (!dialog) return;
    const trigger = checkinTriggerRef.current;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      trigger?.focus();
    };
  }, [checkinDialogOpen]);

  const chronological = useMemo(() => [...checkins].reverse(), [checkins]);
  const selectedCheckin = useMemo(
    () => checkins.find(entry => entry.id === selectedCheckinId) || null,
    [checkins, selectedCheckinId],
  );
  useEffect(() => {
    if (selectedCheckinId && !checkins.some(entry => entry.id === selectedCheckinId)) {
      setSelectedCheckinId(null);
    }
  }, [selectedCheckinId, checkins]);

  const selectCheckin = (id: string) => {
    setSelectedCheckinId(id);
    // The map is above the history list; navigate back to it on small screens.
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    mapSectionRef.current?.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
    // When a visitor selects the same item twice, still open the marker popup.
    mapMarkersRef.current.get(id)?.openPopup();
  };
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

  const toggleComments = async () => {
    if (!isOwner || commentsEnabled === null || changingComments) return;
    setChangingComments(true);
    setMessage('');
    try {
      const desired = !commentsEnabled;
      const result = await backend.setObjectCommentsEnabled(objectId, desired);
      if ('err' in result) throw new Error(result.err);
      setCommentsEnabled(result.ok);
      if (!result.ok) {
        setNote('');
        setPhotoUrl('');
      }
      setMessage(result.ok ? 'New comments are enabled.' :
        'New comments are closed. Location-only check-ins remain available.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update comment settings.');
    } finally {
      setChangingComments(false);
    }
  };

  const deleteCheckpoint = async (entry: Checkin) => {
    if (!isAuthed || !principal || deletingCheckpointId) return;
    if (!isOwner && entry.author !== principal.toText()) return;
    if (!window.confirm('Delete this entire check-in? Its location, note and photo will disappear from the public journey.')) return;
    setDeletingCheckpointId(entry.id);
    setMessage('');
    try {
      const result = await backend.deleteObjectCheckpoint(objectId, entry.timestamp, Principal.fromText(entry.author));
      if ('err' in result) throw new Error(result.err);
      await refresh();
      setMessage('Check-in deleted from the Object journey.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete check-in.');
    } finally {
      setDeletingCheckpointId(null);
    }
  };

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
        note: commentsEnabled === false ? '' : note,
        photoUrl: commentsEnabled === false ? '' : photoUrl,
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
        <p className="journey-hero-note">Scan the QR code to explore this object's journey. You can choose to share a one-time location check-in; this does not enable continuous tracking. <Link to="/objects" style={{ color: 'white' }}>Create your own object</Link></p>
      </section>

      {loadError && <p className="journey-error" role="alert">{loadError}</p>}
      {!checkinDialogOpen && message && <p className="journey-message" role="status">{message}</p>}

      {object?.photoUrl && (
        <section className="journey-object-cover" aria-label="Object photo">
          <ObjectPhoto url={object.photoUrl} name={object.name} />
        </section>
      )}

      {isOwner && <section className="journey-panel journey-comment-settings">
        <div className="journey-section-title"><h2>Comment settings</h2><span>OWNER CONTROLS</span></div>
        <p>Choose whether explorers can attach new notes or photo links.
          Check-in locations and existing journey history remain available.</p>
        {commentsEnabled === null ? (
          <p className="journey-login-notice">Comment controls require an updated ICP backend. Existing check-ins still work; no setting has been changed.</p>
        ) : (
          <button type="button" className="journey-button journey-button-soft"
            disabled={changingComments} onClick={() => void toggleComments()}>
            {changingComments ? 'Updating…' : commentsEnabled ? 'Pause new comments' : 'Allow new comments'}
          </button>
        )}
      </section>}

      <section className="journey-stats" aria-label="Journey statistics">
        <div><strong>{checkins.length}</strong><span>Check-ins</span></div>
        <div><strong>{straightLineKm.toFixed(1)} km</strong><span>Between reported stops*</span></div>
        <div><strong>{checkins.length ? formatDate(checkins[0].createdAt).split(',')[0] : '—'}</strong><span>Last spotted</span></div>
      </section>

      <section className="journey-panel journey-join-panel">
        <div className="journey-section-title"><h2>Join the adventure</h2><span>01 / CHECK IN</span></div>
        <p>Found this object? Add a note and one approximate location to its journey whenever you choose.</p>
        {pendingForObject.length > 0 && <p className="journey-login-notice" role="status">
          {pendingForObject.length} check-in{pendingForObject.length === 1 ? '' : 's'} saved on this device, waiting to sync.
          {!isAuthed && guestMode && ' Guest entries require human verification before they can sync.'}
        </p>}
        {!checkinDialogOpen && online && guestMode &&
          pendingForObject.some(item => item.principal === null) && guestConfig.siteKey && (
            <div className="journey-pending-verification">
              <p>Verify to sync your saved guest check-in.</p>
              <GuestTurnstile siteKey={guestConfig.siteKey}
                onToken={setGuestToken} resetSignal={guestReset} />
            </div>
          )}
        <button ref={checkinTriggerRef} className="journey-button journey-join-cta" type="button"
          onClick={() => setCheckinDialogOpen(true)}>Add a check-in</button>
      </section>

      {checkinDialogOpen && (
        <dialog ref={checkinDialogRef} className="journey-checkin-dialog journey-checkin"
          aria-labelledby="journey-checkin-title"
          onCancel={() => setCheckinDialogOpen(false)}>
          <div className="journey-dialog-header">
            <h2 id="journey-checkin-title">Join the adventure</h2>
            <button type="button" className="journey-dialog-close"
              aria-label="Close check-in form" onClick={() => setCheckinDialogOpen(false)}>×</button>
          </div>
          <div className="journey-dialog-body">
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
            <button type="button" onClick={() => {
              checkinDialogRef.current?.close();
              setCheckinDialogOpen(false);
              setLoginModal(true);
            }}>Sign in to check in</button>
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
          {commentsEnabled === false ? (
            <p className="journey-login-notice" role="status">
              The owner has paused new comments and photo links. You can still share an approximate location check-in.
            </p>
          ) : <>
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
          </>}
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
            <span>{commentsEnabled === false
              ? 'I agree to publish this approximate location on the public journey map.'
              : 'I agree to publish this approximate location, note and optional photo link on the public journey map.'}</span>
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
          </div>
        </dialog>
      )}

      <section className="journey-panel journey-map-section" ref={mapSectionRef}>
        <div className="journey-section-title"><h2>Journey map</h2><span>02 / MAP</span></div>
        <div className="journey-map">
          <MapContainer key={checkins[0]?.id || 'empty'} center={center} zoom={positions.length ? 11 : 8} scrollWheelZoom={false} style={{ height: 350, width: '100%' }}>
            <JourneyMapFocus selected={selectedCheckin} />
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {positions.length > 1 && <Polyline positions={positions} pathOptions={{ color: '#355e48', weight: 3, dashArray: '7 7' }} />}
            {chronological.map((entry, index) => (
              <CircleMarker
                key={entry.id}
                ref={(marker) => {
                  if (marker) mapMarkersRef.current.set(entry.id, marker);
                  else mapMarkersRef.current.delete(entry.id);
                }}
                center={[entry.latitude, entry.longitude]}
                radius={selectedCheckinId === entry.id ? 15 : index === chronological.length - 1 ? 9 : 6}
                eventHandlers={{ click: () => setSelectedCheckinId(entry.id) }}
                pathOptions={selectedCheckinId === entry.id
                  ? { color: '#a83f12', fillColor: '#ffdc50', fillOpacity: 1, weight: 5 }
                  : { color: '#234c37', fillColor: '#a2d4a3', fillOpacity: 1, weight: 2 }}>
                <Popup><strong>{ACTIONS[entry.action]?.title || 'Cup spotted'}</strong><p>{formatDate(entry.createdAt)}</p>{entry.note && <p>{entry.note}</p>}{entry.photoUrl && <CheckinPhoto url={entry.photoUrl} label="Check-in photo" />}</Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
        <p className="journey-map-note">Select a check-in below to highlight its location on the map. * Dashed connections join voluntary reports, not the actual route traveled. Anyone with the QR link can see this approximate public map.</p>
        {loading && <p>Loading the journey…</p>}
        {!loading && checkins.length === 0 && !loadError && <p>No stops yet. Be the first explorer to check in!</p>}
        <div className="journey-timeline">
          {checkins.map((entry) => (
            <article className={'journey-stop' + (selectedCheckinId === entry.id ? ' journey-stop--selected' : '')} key={entry.id}>
              <button type="button" className="journey-stop-select"
                aria-pressed={selectedCheckinId === entry.id}
                aria-label={'Highlight this check-in on map: ' + (ACTIONS[entry.action]?.title || 'Object spotted') + ', ' + formatDate(entry.createdAt)}
                onClick={() => selectCheckin(entry.id)}>
                <span className="journey-stop-icon">{ACTIONS[entry.action]?.icon || '📍'}</span>
                <span className="journey-stop-content">
                  <strong>{ACTIONS[entry.action]?.title || 'Object spotted'}</strong>
                  <small>{formatDate(entry.createdAt)} · {entry.latitude.toFixed(3)}, {entry.longitude.toFixed(3)}</small>
                  {entry.note && <span className="journey-stop-note">{entry.note}</span>}
                  <span className="journey-stop-hint">{selectedCheckinId === entry.id ? '● Highlighted on map' : '◎ View on map'}</span>
                </span>
              </button>
              {entry.photoUrl && <CheckinPhoto url={entry.photoUrl} label="Photo from this check-in" />}
              {commentsEnabled !== null && isAuthed && principal &&
                (isOwner || entry.author === principal.toText()) && (
                  <button type="button" className="journey-delete-comment"
                    disabled={deletingCheckpointId !== null} onClick={() => void deleteCheckpoint(entry)}>
                    {deletingCheckpointId === entry.id ? 'Deleting…' : 'Delete check-in'}
                  </button>
                )}
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
