import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './ObjectJourney.css';

type Action = 'found' | 'carried' | 'left';
type Checkin = {
  id: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  action: Action;
  note: string;
  createdAt: string;
};
type JourneyResponse = { objectId: string; checkins: Checkin[]; error?: string };
type LocationPreview = { latitude: number; longitude: number; accuracyMeters: number };

const ACTIONS: Record<Action, { title: string; icon: string }> = {
  found: { title: 'I found the cup', icon: '👀' },
  carried: { title: 'I brought it here', icon: '🥾' },
  left: { title: 'I left it for the next explorer', icon: '☕' },
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
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [location, setLocation] = useState<LocationPreview | null>(null);
  const [locating, setLocating] = useState(false);
  const [action, setAction] = useState<Action>('carried');
  const [note, setNote] = useState('');
  const [consented, setConsented] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = async () => {
    try {
      const result = await fetch(`/api/objects/${encodeURIComponent(objectId)}`, { cache: 'no-store' });
      const data = await result.json() as JourneyResponse;
      if (!result.ok) throw new Error(data.error || 'Unable to load journey.');
      setCheckins(data.checkins);
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
  }, [objectId]);

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

  const submit = async () => {
    if (!location || !consented || sending || loadError) return;
    setSending(true);
    setMessage('');
    try {
      const response = await fetch(`/api/objects/${encodeURIComponent(objectId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...location, action, note }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Check-in failed.');
      setMessage('Thank you! Your check-in is now part of the cup’s journey.');
      setLocation(null);
      setNote('');
      setConsented(false);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Check-in failed. Please retry.');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="journey-page">
      <section className="journey-hero">
        <div className="journey-overline">ALLTRACKS · OBJECT RELAY EXPERIMENT</div>
        <div className="journey-cup">☕</div>
        <h1>Track Me Down</h1>
        <p className="journey-intro">I'm a wandering cup. Found me on a trail? Help me travel, then check me in so everyone can see where I've been.</p>
        <span className="journey-id">Cup ID · {objectId}</span>
        <p className="journey-zh">这是一个传递杯子的户外实验。扫描后自愿记录一次位置，不会持续追踪你。</p>
      </section>

      <section className="journey-stats" aria-label="Journey statistics">
        <div><strong>{checkins.length}</strong><span>Check-ins</span></div>
        <div><strong>{straightLineKm.toFixed(1)} km</strong><span>Between reported stops*</span></div>
        <div><strong>{checkins.length ? formatDate(checkins[0].createdAt).split(',')[0] : '—'}</strong><span>Last spotted</span></div>
      </section>

      <section className="journey-panel journey-checkin">
        <div className="journey-section-title"><h2>Join the adventure</h2><span>01 / CHECK IN</span></div>
        <p>You control whether to share a location. We only save an approximate point (rounded to ~100 m), an optional note, and the time.</p>
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
        <button className="journey-button journey-button-soft" type="button" onClick={locate} disabled={locating || Boolean(loadError)}>
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
          <span>I agree to publish this approximate location and note on the public journey map.</span>
        </label>
        <button className="journey-button" type="button" onClick={submit} disabled={!location || !consented || sending || Boolean(loadError)}>
          {sending ? 'Saving check-in…' : 'Add this stop to the journey'}
        </button>
        {message && <p className="journey-message" role="status">{message}</p>}
        {loadError && <p className="journey-error" role="alert">{loadError} The public check-in service must be configured before field testing.</p>}
      </section>

      <section className="journey-panel">
        <div className="journey-section-title"><h2>The cup's journey</h2><span>02 / MAP</span></div>
        <div className="journey-map">
          <MapContainer key={checkins[0]?.id || 'empty'} center={center} zoom={positions.length ? 11 : 8} scrollWheelZoom={false} style={{ height: 350, width: '100%' }}>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {positions.length > 1 && <Polyline positions={positions} pathOptions={{ color: '#355e48', weight: 3, dashArray: '7 7' }} />}
            {chronological.map((entry, index) => (
              <CircleMarker key={entry.id} center={[entry.latitude, entry.longitude]} radius={index === chronological.length - 1 ? 9 : 6}
                pathOptions={{ color: '#234c37', fillColor: '#a2d4a3', fillOpacity: 1, weight: 2 }}>
                <Popup><strong>{ACTIONS[entry.action]?.title || 'Cup spotted'}</strong><p>{formatDate(entry.createdAt)}</p>{entry.note && <p>{entry.note}</p>}</Popup>
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
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="journey-footer">Please keep the trail clean and respect park rules. Never take another person's property. This is an opt-in experiment about an object, not live tracking of people.</footer>
    </main>
  );
}
