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
  queueObjectCheckin, isDeferredLoginCheckin, isGuestGatewayCheckin, type PendingObjectCheckin } from '../lib/offlineCheckins';
import { flushSignedInCheckins, syncOneGuestCheckin } from '../lib/checkinSync';
import { buildJourneyTimeline } from '../lib/journeyTimeline';
import { ShortUserId } from '../components/ShortUserId';
import { WanderCheckpointPhotos } from '../components/WanderPhotoGallery';
import { WanderCameraPicker } from '../components/WanderCameraPicker';
import { queueWanderPhoto, listPendingWanderPhotos, WANDER_PHOTO_OUTBOX_EVENT, type PendingWanderPhoto } from '../lib/offlineWanderPhotos';
import type { WanderPhotoLifecycleBackend } from '../lib/wanderPhotoLifecycle';

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


function PendingPhotoPreview({ item }: { item: PendingWanderPhoto }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const next = URL.createObjectURL(item.file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [item.file]);
  return <figure style={{ margin: '12px 0' }}>
    {url && <img src={url} alt="Photo waiting for upload"
      style={{ width: 180, maxWidth: '100%', borderRadius: 10 }} />}
    <figcaption>{item.lastError || 'Saved locally — not published yet'}</figcaption>
  </figure>;
}

export function ObjectJourney() {
  const { objectId = '' } = useParams<'objectId'>();
  return <ObjectJourneyPage key={objectId} objectId={objectId} />;
}

function ObjectJourneyPage({ objectId }: { objectId: string }) {
  const backend = useAlltracks();
  const comments = useComment();
  const { state: { isAuthed, principal, agent } } = useGlobalContext();
  const [, setLoginModal] = useSetLoginModal();
  const [object, setObject] = useState<ObjectRecord | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [stopPage, setStopPage] = useState(0);
  const stopsPerPage = 20;
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
  const [checkinPhoto, setCheckinPhoto] = useState<File | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<PendingWanderPhoto[]>([]);
  const [consented, setConsented] = useState(false);
  const [publishAsGuest, setPublishAsGuest] = useState(false);
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
  const [guestReporter, setGuestReporter] = useState<string | null>(null);
  useEffect(() => {
    if (!online) return;
    let active = true;
    void (async () => {
      try {
        const policy = await backend.getObjectGuestPolicy(objectId);
        if (active) setGuestReporter(policy.length ? policy[0].gateway.toText() : null);
      } catch { /* Keep previously known gateway identity during a transient failure. */ }
    })();
    return () => { active = false; };
  }, [backend, objectId, online]);
  const [pendingForObject, setPendingForObject] = useState<PendingObjectCheckin[]>([]);
  const [retryClock, setRetryClock] = useState(() => Date.now());
  const guestSyncing = useRef(false);
  const guestMode = !isAuthed && guestConfig.enabled && Boolean(guestConfig.siteKey) && Boolean(guestConfig.gatewayPrincipal);
  const canCheckin = !isAuthed || Boolean(principal);
  const useGuestGateway = !isAuthed && guestMode && publishAsGuest;
  const isOwner = Boolean(isAuthed && principal && object && principal.toText() === object.owner);
  const isGuestReporter = (author: string) => guestReporter !== null && guestReporter === author;

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
    if (online) void refresh();
    else setLoading(false);
    // Reload the public journey after reconnecting as well as on navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objectId, backend, online]);

  useEffect(() => {
    let active = true;
    let generation = 0;
    let previousIds: Set<string> | null = null;
    const load = () => {
      const version = ++generation;
      void listPendingCheckins().then(items => {
        if (!active || version !== generation) return;
        const next = items.filter((item): item is PendingObjectCheckin =>
          item.kind === 'object' && item.objectId === objectId);
        const ids = new Set(next.map(item => item.id));
        const removed = previousIds && [...previousIds].some(id => !ids.has(id));
        previousIds = ids;
        setPendingForObject(next);
        // The global outbox manager can finish a sync independently of this
        // page. Reload the public records when an item leaves the queue.
        if (removed && !isOffline()) void refresh();
      }).catch(() => {});
    };
    load();
    window.addEventListener(CHECKIN_OUTBOX_EVENT, load);
    window.addEventListener('focus', load);
    return () => {
      active = false;
      window.removeEventListener(CHECKIN_OUTBOX_EVENT, load);
      window.removeEventListener('focus', load);
    };
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

  const principalText = isAuthed && principal ? principal.toText() : null;
  const timeline = useMemo(() => buildJourneyTimeline(checkins, pendingForObject, objectId, principalText),
    [checkins, pendingForObject, objectId, principalText]);
  const localCount = timeline.filter(row => row.kind === 'local').length;
  const chronological = useMemo(() => [...checkins].reverse(), [checkins]);
  const totalStopPages = Math.max(1, Math.ceil(timeline.length / stopsPerPage));
  const currentStopPage = Math.min(stopPage, totalStopPages - 1);
  const visibleTimeline = timeline.slice(currentStopPage * stopsPerPage, (currentStopPage + 1) * stopsPerPage);
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
    const stopIndex = timeline.findIndex(row => row.kind !== 'local' && row.item.id === id);
    if (stopIndex >= 0) setStopPage(Math.floor(stopIndex / stopsPerPage));
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
      isGuestGatewayCheckin(item) && (!item.nextAttemptAt || item.nextAttemptAt <= retryClock))
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
      setMessage('Check-in deleted. Linked storage photos are queued for revocation and cleanup.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete check-in.');
    } finally {
      setDeletingCheckpointId(null);
    }
  };

  useEffect(() => {
    let active = true;
    const refreshPhotos = () => {
      void listPendingWanderPhotos(objectId).then(items => {
        if (active) setPendingPhotos(items);
      }).catch(() => {});
    };
    refreshPhotos();
    window.addEventListener(WANDER_PHOTO_OUTBOX_EVENT, refreshPhotos);
    return () => {
      active = false;
      window.removeEventListener(WANDER_PHOTO_OUTBOX_EVENT, refreshPhotos);
    };
  }, [objectId]);

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
        claimOnLogin: !isAuthed && !useGuestGateway,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracyMeters: location.accuracyMeters,
        action,
        note: commentsEnabled === false ? '' : note,
        photoUrl: commentsEnabled === false ? '' : photoUrl,
      });
      if (checkinPhoto) {
        await queueWanderPhoto({ objectId, file: checkinPhoto,
          principal: isAuthed ? principal!.toText() : null });
        setCheckinPhoto(null);
      }
      setLocation(null);
      setNote('');
      setPhotoUrl('');
      setConsented(false);
      setPublishAsGuest(false);
      setMessage(isDeferredLoginCheckin(queued)
        ? 'Stop saved on this device. It will publish automatically after you sign in.'
        : 'Check-in saved on this device. It will sync when connectivity and authorization are available.');
      // Local persistence has succeeded. Dismiss the form even if cloud
      // synchronization is still pending; the page shows the save status.
      // Guest verification resumes in the pending-check-in panel.
      setGuestToken('');
      setCheckinDialogOpen(false);
      if (!isOffline() && isAuthed && principal) {
        try {
          await flushSignedInCheckins(backend, comments, principal.toText(), true);
          const items = await listPendingCheckins();
          if (!items.some(item => item.id === queued.id)) {
            setMessage('Check-in synced to ICP.');
            await refresh();
          }
        } catch {
          setMessage('Check-in saved on this device. Cloud sync could not be confirmed; it will be retried.');
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

      {pendingPhotos.length > 0 && <section className="journey-panel" aria-label="Photos waiting for upload">
        <h2>Photos saved on this device</h2>
        <p role="status">{pendingPhotos.length} photo(s) are saved locally, not yet published to the journey.
          {isOwner && isAuthed ? ' Upload will resume when online.' :
            ' Current storage permissions only allow the Object owner to publish photos.'}</p>
        {pendingPhotos.map(item => <PendingPhotoPreview key={item.id} item={item} />)}
      </section>}

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
          {pendingForObject.some(isDeferredLoginCheckin) && ' Sign in on this device to automatically publish your saved stops.'}
        </p>}
        {!checkinDialogOpen && online && guestMode &&
          pendingForObject.some(isGuestGatewayCheckin) && guestConfig.siteKey && (
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
            Unpublished stops stay on this device until sign-in or authorized guest verification.
          </p>}
          {!isAuthed && <p className="journey-login-notice">
            No sign-in needed to save a stop. By default it stays on this device and will publish
            automatically under the next account you sign in with here. Do not use this option
            on a shared device unless you intend that account to publish it.
          </p>}
          {guestMode && <label className="journey-consent">
            <input type="checkbox" checked={publishAsGuest} onChange={event => {
              setPublishAsGuest(event.target.checked);
              setConsented(false);
            }} />
            <span>Publish as a guest instead (human verification required after saving).</span>
          </label>}
          <p>You choose whether to share a location. Only an approximate point (rounded to ~100 m),
            a note, and a timestamp are saved on the existing AllTracks ICP canister.
            {isAuthed ? ' Signed-in checkpoints are associated with your account Principal.' : useGuestGateway ? ' Guest submissions are attributed to the service gateway.' : ' Your saved stop will be attributed to the next account you sign in with on this device.'}
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
            <label>Check-in photo (optional)</label>
            <WanderCameraPicker value={checkinPhoto} onChange={setCheckinPhoto} disabled={sending} />
            <p className="journey-photo-hint">Captured photos are saved on this device. Publishing requires an authorized upload.</p>
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
            <span>{!isAuthed && !useGuestGateway
              ? 'I agree to save this stop locally and automatically publish its approximate location, note and optional photo link under the next account I sign in with on this device.'
              : commentsEnabled === false
                ? 'I agree to publish this approximate location on the public journey map.'
                : 'I agree to publish this approximate location, note and optional photo link on the public journey map.'}</span>
          </label>
          <button className="journey-button" type="button" onClick={submit}
            disabled={!location || !consented || !canCheckin || sending || (online && Boolean(loadError))}>
            {sending ? 'Saving check-in…' : !isAuthed && !useGuestGateway ? 'Save stop · Sign in later' : online ? 'Save and sync this stop' : 'Save check-in offline'}
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
                <Popup><strong>{ACTIONS[entry.action]?.title || 'Cup spotted'}</strong><p>{formatDate(entry.createdAt)}</p><p>{isGuestReporter(entry.author) ? 'Guest (shared gateway)' : <>Reporter: <ShortUserId id={entry.author} /></>}</p>{entry.note && <p>{entry.note}</p>}{entry.photoUrl && <CheckinPhoto url={entry.photoUrl} label="Check-in photo" />}</Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
        <p className="journey-map-note">Select a check-in below to highlight its location on the map. * Dashed connections join voluntary reports, not the actual route traveled. Anyone with the QR link can see this approximate public map.</p>
        {loading && <p>Loading the journey…</p>}
      
{!online && (
  <p className="journey-map-note">
    Offline — public journey history may be incomplete.
    Local check-ins remain available below.
  </p>
)}

{online && !loading && timeline.length === 0 && !loadError && (
  <p>No stops yet. Be the first explorer to check in!</p>
)}

{localCount > 0 && (
  <p className="journey-map-note" role="status">
    {localCount} local check-in{localCount === 1 ? '' : 's'} below.
    Only visible on this device until synced;
    excluded from the public map and statistics.
  </p>
)}

{timeline.length > stopsPerPage && (
  <nav
    aria-label="Journey stop pages"
    style={{
      display: 'flex',
      gap: 12,
      alignItems: 'center',
      margin: '12px 0',
    }}
  >
    <button
      type="button"
      disabled={currentStopPage === 0}
      onClick={() => setStopPage(currentStopPage - 1)}
    >
      Previous
    </button>

    <span>
      Page {currentStopPage + 1} of {totalStopPages}
      {' · '}
      {timeline.length} stops
    </span>

    <button
      type="button"
      disabled={currentStopPage === totalStopPages - 1}
      onClick={() => setStopPage(currentStopPage + 1)}
    >
      Next
    </button>
  </nav>
)}

<div className="journey-timeline">
  {visibleTimeline.map(row => {
    if (row.kind === 'local') {
      const entry = row.item;
      const deferred = isDeferredLoginCheckin(entry);

      const status = deferred
        ? (online ? 'Awaiting sign-in' : 'Offline · Awaiting sign-in')
        : !online
          ? 'Offline · Pending sync'
          : entry.lastError
            ? 'Sync failed · Pending retry'
            : isGuestGatewayCheckin(entry)
              ? 'Pending guest verification'
              : 'Pending sync';

      return (
        <article
          className="journey-stop journey-stop--local"
          key={'local-' + entry.id}
        >
          <div className="journey-stop-local-body">
            <span className="journey-stop-icon">
              {ACTIONS[entry.action]?.icon || '📍'}
            </span>

            <span className="journey-stop-content">
              <span className="journey-local-badge">{status}</span>
              <strong>
                {ACTIONS[entry.action]?.title || 'Object spotted'}
              </strong>

              <small>
                {formatDate(new Date(entry.createdAt).toISOString())}
                {' · '}
                {entry.latitude.toFixed(3)},
                {' '}
                {entry.longitude.toFixed(3)}
              </small>

              <small>
                {deferred
                  ? 'Saved before sign-in'
                  : entry.principal === null
                    ? 'Guest'
                    : <>Saved by you · <ShortUserId id={entry.principal} /></>}
                {' · Only on this device'}
              </small>

              {entry.note && (
                <span className="journey-stop-note">{entry.note}</span>
              )}

              {entry.photoUrl && !online && (
                <small>Photo link saved · Preview available online</small>
              )}
            </span>
          </div>

          {entry.photoUrl && online && (
            <CheckinPhoto
              url={entry.photoUrl}
              label="Locally saved check-in photo"
            />
          )}

          {deferred && !isAuthed && online && (
            <button
              type="button"
              className="journey-button journey-button-soft"
              onClick={() => setLoginModal(true)}
            >
              Sign in to sync
            </button>
          )}
        </article>
      );
    }

    const entry = row.item;
    return (


            <article className={'journey-stop' + (selectedCheckinId === entry.id ? ' journey-stop--selected' : '')} key={entry.id}>
              <button type="button" className="journey-stop-select"
                aria-pressed={selectedCheckinId === entry.id}
                aria-label={'Highlight this check-in on map: ' + (ACTIONS[entry.action]?.title || 'Object spotted') + ', ' + formatDate(entry.createdAt)}
                onClick={() => selectCheckin(entry.id)}>
                <span className="journey-stop-icon">{ACTIONS[entry.action]?.icon || '📍'}</span>
                <span className="journey-stop-content">
                  <strong>{ACTIONS[entry.action]?.title || 'Object spotted'}</strong>
                  <small>{formatDate(entry.createdAt)} · {entry.latitude.toFixed(3)}, {entry.longitude.toFixed(3)}</small>
                  <small>{isGuestReporter(entry.author) ? 'Guest (shared gateway)' : <>Reporter: <ShortUserId id={entry.author} /></>}</small>
                  {entry.note && <span className="journey-stop-note">{entry.note}</span>}
                  <span className="journey-stop-hint">{selectedCheckinId === entry.id ? '● Highlighted on map' : '◎ View on map'}</span>
                </span>
              </button>
              {entry.photoUrl && <CheckinPhoto url={entry.photoUrl} label="Photo from this check-in" />}
              {online && <WanderCheckpointPhotos objectId={objectId}
                timestamp={entry.timestamp} author={Principal.fromText(entry.author)}
                agent={agent} backend={backend as unknown as WanderPhotoLifecycleBackend}
                storageCanisterId={import.meta.env.VITE_ICESTORAGE_CANISTER_ID || undefined} />}
              {commentsEnabled !== null && isAuthed && principal &&
                (isOwner || entry.author === principal.toText()) && (
                  <button type="button" className="journey-delete-comment"
                    disabled={deletingCheckpointId !== null} onClick={() => void deleteCheckpoint(entry)}>
                    {deletingCheckpointId === entry.id ? 'Deleting…' : 'Delete check-in'}
                  </button>
                )}
            </article>
            );
          })}
        </div>
      </section>

      <footer className="journey-footer">Keep trails clean and respect park rules. Never take another person's property.
        QR codes are links, not live trackers. Signed-in checkpoint authors may be identifiable
        by their public ICP Principal; guest reports are not proof of physical custody.
        Do not publish sensitive locations.</footer>
    </main>
  );
}
