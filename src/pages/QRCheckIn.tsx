import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAlltracks, useGlobalContext, useSetLoginModal } from '../components/Store';
import {
  CheckInEntry,
  CheckInLocation,
  checkInCanisterId,
  checkInDate,
  createCheckInActor,
} from '../api/checkin';
import './QRCheckIn.css';

const MAX_NOTE_LENGTH = 500;

function locationUrl(id: bigint): string {
  return new URL('/check-in/' + id.toString(), window.location.origin).toString();
}

// QR contains the public AllTracks URL, not GPS coordinates or a private identifier.
// The image is rendered by an external QR service; check-in records remain on ICP.
function QRShare({ location }: { location: CheckInLocation }) {
  const [copied, setCopied] = useState(false);
  const url = locationUrl(location.id);
  const qrUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=256x256&margin=12&data=' + encodeURIComponent(url);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
      window.prompt('Copy check-in link', url);
    }
  };

  return (
    <div className="checkin-qr-panel">
      <img src={qrUrl} width="256" height="256" alt={'QR code for ' + location.name} />
      <label htmlFor={'share-' + location.id}>Public check-in link</label>
      <input id={'share-' + location.id} readOnly value={url} onFocus={e => e.target.select()} />
      <div className="checkin-actions">
        <button type="button" className="primary-btn" onClick={copy}>{copied ? 'Copied!' : 'Copy link'}</button>
        <button type="button" className="secondary-btn" onClick={() => window.print()}>Print QR</button>
      </div>
      <p className="checkin-muted">Print and place this QR at the location. Anyone with the link can check in — no GPS permission required.</p>
    </div>
  );
}

export function QRCheckInHome() {
  const { state: { agent, isAuthed, principal } } = useGlobalContext();
  const [, openLogin] = useSetLoginModal();
  const alltracks = useAlltracks();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const actor = useMemo(() => createCheckInActor(agent), [agent]);
  const [locations, setLocations] = useState<CheckInLocation[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!actor) { setLoading(false); return; }
    let cancelled = false;
    actor.listLocations(0n, 100n).then(result => {
      if (!cancelled) { setLocations(result); setError(''); }
    }).catch(err => {
      if (!cancelled) setError('Unable to load locations: ' + String(err));
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [actor]);

  // Reuse the location and title of an existing AllTracks Spot.
  useEffect(() => {
    const spotId = params.get('spotId');
    if (!spotId || !/^\d+$/.test(spotId)) return;
    let cancelled = false;
    alltracks.getSpotById(BigInt(spotId)).then((result: any) => {
      if (cancelled || !result?.length) return;
      const spot = result[0];
      setName(spot.name || '');
      try {
        const d = JSON.parse(spot.description || '{}');
        if (Number.isFinite(Number(d.latitude))) setLatitude(String(d.latitude));
        if (Number.isFinite(Number(d.longitude))) setLongitude(String(d.longitude));
        setDescription(typeof d.note === 'string' ? d.note : '');
      } catch { setDescription(spot.description || ''); }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [alltracks, params]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setError('Location services are not available on this device.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setLocating(false);
        setError('');
      },
      err => { setError('Could not get location: ' + err.message); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!actor) return;
    if (!isAuthed) { openLogin(true); return; }
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!latitude.trim() || !longitude.trim() || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      setError('Enter valid latitude and longitude, or use current location.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await actor.createLocation(name.trim(), description.trim(), lat, lon);
      if ('err' in result) throw new Error(result.err);
      navigate('/check-in/' + result.ok.id.toString());
    } catch (err) {
      setError('Unable to create QR location: ' + String(err));
    } finally { setSaving(false); }
  };

  return (
    <div className="page-container qr-checkin-page">
      <div className="checkin-heading">
        <h2>QR Location Check In</h2>
        <p>Give a place a QR code. Anyone who scans it can check in and leave a note, stored on ICP.</p>
      </div>
      {!checkInCanisterId && (
        <p className="checkin-error" role="alert">ICP check-in canister is not configured yet. Deploy it and set VITE_CHECKIN_CANISTER_ID before using this feature.</p>
      )}
      {error && <p className="checkin-error" role="alert">{error}</p>}
      <section className="checkin-card">
        <h3>Create a QR location</h3>
        {!isAuthed && <p>Sign in to create a location. Visitors do not need to sign in to check in.</p>}
        <form onSubmit={create} className="checkin-form">
          <label>Location name
            <input required maxLength={100} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Trail guestbook at the viewpoint" />
          </label>
          <label>Description (optional)
            <textarea maxLength={400} rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="A short message for visitors" />
          </label>
          <div className="checkin-coordinates">
            <label>Latitude
              <input inputMode="decimal" value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="49.123456" required />
            </label>
            <label>Longitude
              <input inputMode="decimal" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="-122.123456" required />
            </label>
          </div>
          <div className="checkin-actions">
            <button type="button" className="secondary-btn" disabled={locating} onClick={useCurrentLocation}>{locating ? 'Locating…' : 'Use current location'}</button>
            <button type="submit" className="primary-btn" disabled={!actor || saving}>{saving ? 'Saving to ICP…' : isAuthed ? 'Create QR location' : 'Sign in to create'}</button>
          </div>
        </form>
      </section>
      <section className="checkin-card">
        <h3>Locations</h3>
        {loading ? <p>Loading…</p> : locations.length === 0 ? <p>No QR locations yet.</p> : (
          <ul className="checkin-location-list">
            {locations.map(location => (
              <li key={location.id.toString()}>
                <div>
                  <Link to={'/check-in/' + location.id.toString()}><strong>{location.name}</strong></Link>
                  <p className="checkin-muted">{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)} · {checkInDate(location.createdAt)}{!location.active && ' · Closed'}</p>
                </div>
                {principal && location.createdBy.toText() === principal.toText() && <span className="checkin-owner">Your location</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function QRCheckInDetail() {
  const { locationId } = useParams();
  const { state: { agent, principal } } = useGlobalContext();
  const actor = useMemo(() => createCheckInActor(agent), [agent]);
  const validId = !!locationId && /^\d+$/.test(locationId);
  const id = validId ? BigInt(locationId!) : null;
  const [location, setLocation] = useState<CheckInLocation | null>(null);
  const [entries, setEntries] = useState<CheckInEntry[]>([]);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isOwner = !!principal && !!location && principal.toText() === location.createdBy.toText();

  useEffect(() => {
    if (!actor || id === null) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    Promise.all([actor.getLocation(id), actor.listCheckIns(id, 0n, 100n)])
      .then(([loc, visits]) => {
        if (!cancelled) { setLocation(loc[0] ?? null); setEntries(visits); }
      }).catch(err => {
        if (!cancelled) setError('Unable to load check-in: ' + String(err));
      }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [actor, locationId]); // id is derived from locationId

  const refresh = async () => {
    if (!actor || id === null) return;
    setEntries(await actor.listCheckIns(id, 0n, 100n));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!actor || id === null || !location?.active) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const result = await actor.checkIn(id, name.trim(), note.trim());
      if ('err' in result) throw new Error(result.err);
      setName('');
      setNote('');
      setSuccess('Check-in saved on ICP. Thank you for visiting!');
      await refresh();
    } catch (err) {
      setError('Check-in not saved: ' + String(err));
    } finally { setSaving(false); }
  };

  const toggleActive = async () => {
    if (!actor || id === null || !location) return;
    setUpdating(true);
    setError('');
    try {
      const result = await actor.setLocationActive(id, !location.active);
      if ('err' in result) throw new Error(result.err);
      setLocation(result.ok);
    } catch (err) { setError(String(err)); } finally { setUpdating(false); }
  };

  const removeEntry = async (entry: CheckInEntry) => {
    if (!actor || !window.confirm('Remove this public note?')) return;
    setUpdating(true);
    setError('');
    try {
      const result = await actor.removeCheckIn(entry.id);
      if ('err' in result) throw new Error(result.err);
      await refresh();
    } catch (err) { setError(String(err)); } finally { setUpdating(false); }
  };

  return (
    <div className="page-container qr-checkin-page">
      <Link to="/check-ins">← All QR locations</Link>
      {!actor && <p className="checkin-error" role="alert">ICP check-in canister is not configured.</p>}
      {!validId && <p className="checkin-error">Invalid check-in link.</p>}
      {error && <p className="checkin-error" role="alert">{error}</p>}
      {loading ? <p>Loading check-in…</p> : !location ? <p>Location not found.</p> : (
        <>
          <section className="checkin-card">
            <h2>{location.name}</h2>
            {location.description && <p>{location.description}</p>}
            <p className="checkin-muted">Coordinates: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>
            <a href={'https://www.openstreetmap.org/?mlat=' + location.latitude + '&mlon=' + location.longitude + '#map=16/' + location.latitude + '/' + location.longitude} target="_blank" rel="noopener noreferrer">View on map</a>
            {!location.active && <p className="checkin-error">This location is not accepting check-ins.</p>}
          </section>
          <section className="checkin-card">
            <h3>Check In</h3>
            <p className="checkin-muted">No account or GPS permission required. Your note and optional name will be public. Scanning a QR does not prove physical presence.</p>
            <form className="checkin-form" onSubmit={submit}>
              <label>Your name (optional)
                <input maxLength={40} value={name} onChange={e => setName(e.target.value)} placeholder="Guest / trail name" />
              </label>
              <label>Note (optional)
                <textarea rows={4} maxLength={MAX_NOTE_LENGTH} value={note} onChange={e => setNote(e.target.value)} placeholder="What did you see? Leave a message for the next visitor…" />
              </label>
              <div className="checkin-actions">
                <button type="submit" className="primary-btn" disabled={!location.active || saving}>{saving ? 'Saving…' : 'Check In'}</button>
                {success && <span className="checkin-success" role="status">{success}</span>}
              </div>
            </form>
          </section>
          {isOwner && (
            <section className="checkin-card">
              <h3>Manage your location</h3>
              <button type="button" className="secondary-btn" disabled={updating} onClick={toggleActive}>{location.active ? 'Close check-ins' : 'Reopen check-ins'}</button>
              <QRShare location={location} />
            </section>
          )}
          <section className="checkin-card">
            <h3>Visitor log</h3>
            {entries.length === 0 ? <p>No check-ins yet. Be the first!</p> : (
              <ol className="checkin-entries">
                {entries.map(entry => (
                  <li key={entry.id.toString()}>
                    <div className="checkin-entry-head">
                      <strong>{entry.name || 'Anonymous visitor'}</strong>
                      <time>{checkInDate(entry.createdAt)}</time>
                    </div>
                    {entry.note && <p>{entry.note}</p>}
                    {isOwner && <button type="button" className="checkin-remove" disabled={updating} onClick={() => removeEntry(entry)}>Remove note</button>}
                  </li>
                ))}
              </ol>
            )}
            {entries.length === 100 && <p className="checkin-muted">Showing the latest 100 check-ins.</p>}
          </section>
        </>
      )}
    </div>
  );
}
