import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAlltracks, useComment, useGlobalContext, useSetLoginModal } from '../components/Store';
import type { Comment } from '../api/comment/comment.did';
import { CheckinPhoto } from '../components/CheckinPhoto';
import { normalizeCheckinPhotoUrl } from '../lib/checkinPhoto';
import './SpotCheckIn.css';

type Spot = {
  id: string;
  name: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
};

type GuestMessage = { v: 1; name: string; note: string; photoUrl?: string };

const checkInTarget = (id: string) => ({ other: 'spot-checkin:' + id });
const parseMessage = (content: string): GuestMessage => {
  try {
    const parsed = JSON.parse(content);
    if (parsed?.v === 1 && typeof parsed.name === 'string' && typeof parsed.note === 'string') {
      let photoUrl = '';
      if (typeof parsed.photoUrl === 'string') {
        try { photoUrl = normalizeCheckinPhotoUrl(parsed.photoUrl); } catch { /* Don't display unsafe URLs. */ }
      }
      return { v: 1, name: parsed.name, note: parsed.note, photoUrl };
    }
  } catch { /* Legacy plain text */ }
  return { v: 1, name: '', note: content };
};

export default function SpotCheckIn() {
  const { spotId } = useParams();
  const validId = !!spotId && /^\d+$/.test(spotId);
  const alltracks = useAlltracks();
  const comments = useComment();
  const { state: { isAuthed } } = useGlobalContext();
  const [, openLogin] = useSetLoginModal();

  const [spot, setSpot] = useState<Spot | null>(null);
  const [entries, setEntries] = useState<Comment[]>([]);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const url = useMemo(() => validId ? new URL('/check-in/' + spotId, window.location.origin).toString() : '', [validId, spotId]);
  const qr = 'https://api.qrserver.com/v1/create-qr-code/?size=256x256&margin=12&data=' + encodeURIComponent(url);

  useEffect(() => {
    if (!validId || !spotId) { setError('Invalid check-in link.'); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      alltracks.getSpotById(BigInt(spotId)),
      comments.getComments(checkInTarget(spotId), 0n)
    ]).then(([spots, visits]) => {
      if (cancelled) return;
      const record = spots[0];
      if (!record) { setSpot(null); setError('This Spot does not exist.'); return; }
      let description = record.description || '';
      let latitude: number | null = null;
      let longitude: number | null = null;
      try {
        const data = JSON.parse(description);
        if (typeof data.note === 'string') description = data.note;
        if (typeof data.latitude === 'number' && Number.isFinite(data.latitude)) latitude = data.latitude;
        if (typeof data.longitude === 'number' && Number.isFinite(data.longitude)) longitude = data.longitude;
      } catch { /* The Spot may use a plain-text description */ }
      setSpot({ id: String(record.id), name: record.name, description, latitude, longitude });
      setEntries(visits);
      setError('');
    }).catch(err => { if (!cancelled) setError('Failed to load Spot check-in: ' + String(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [spotId, validId, alltracks, comments]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!spotId || !spot || !isAuthed) { openLogin(true); return; }
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload: GuestMessage = { v: 1, name: name.trim(), note: note.trim(), photoUrl: normalizeCheckinPhotoUrl(photoUrl) };
      const result = await comments.addComment({
        comto: checkInTarget(spotId),
        comment: JSON.stringify(payload),
        attachments: [],
      });
      if ('err' in result) throw new Error(result.err);
      setSuccess('Check-in saved successfully.');
      setName('');
      setNote('');
      setPhotoUrl('');
      setEntries(await comments.getComments(checkInTarget(spotId), 0n));
    } catch (err) {
      setError('Check-in failed: ' + String(err));
    } finally { setSaving(false); }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch { window.prompt('Copy check-in link', url); }
  };

  return (
    <div className="page-container spot-checkin-page">
      <Link to={validId ? '/spots/' + spotId : '/spots'}>← Back to Spot</Link>
      {loading && <p>Loading check-in…</p>}
      {error && <p className="spot-checkin-error" role="alert">{error}</p>}
      {spot && (
        <>
          <section className="spot-checkin-card">
            <h2>{spot.name} · Check In</h2>
            {spot.description && <p>{spot.description}</p>}
            {spot.latitude !== null && spot.longitude !== null && (
              <a
                href={'https://www.openstreetmap.org/?mlat=' + spot.latitude + '&mlon=' + spot.longitude + '#map=16/' + spot.latitude + '/' + spot.longitude}
                target="_blank"
                rel="noopener noreferrer"
              >View location on map</a>
            )}
            <p className="spot-checkin-hint">Anyone can open this public link. Signing in is currently required to save a check-in because the existing ICP comment service rejects anonymous writes. A scan alone does not prove physical presence.</p>
          </section>
          <section className="spot-checkin-card">
            <h3>Check In</h3>
            <form className="spot-checkin-form" onSubmit={submit}>
              <label>Display name (optional)
                <input maxLength={40} value={name} onChange={event => setName(event.target.value)} placeholder="Guest / trail name" />
              </label>
              <label>Note (optional)
                <textarea rows={3} maxLength={500} value={note} onChange={event => setNote(event.target.value)} placeholder="Leave a note about your visit…" />
              </label>
              <label>Photo URL (optional)
                <input type="url" inputMode="url" maxLength={220} value={photoUrl}
                  onChange={event => setPhotoUrl(event.target.value)}
                  placeholder="https://example.com/photo.jpg" />
              </label>
              <p className="spot-checkin-hint">Use a public HTTPS link to an image. The image will appear
                with your check-in and may be loaded from the external photo host.</p>
              <div className="spot-checkin-actions">
                {isAuthed
                  ? <button className="primary-btn" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Check In'}</button>
                  : <button className="primary-btn" type="button" onClick={() => openLogin(true)}>Sign in to Check In</button>}
                {success && <span className="spot-checkin-success" role="status">{success}</span>}
              </div>
            </form>
          </section>
          <section className="spot-checkin-card spot-checkin-share">
            <h3>Share QR code</h3>
            <img src={qr} alt={'QR code for ' + spot.name} width={256} height={256} />
            <label>Public check-in URL <input readOnly value={url} onFocus={event => event.target.select()} /></label>
            <div className="spot-checkin-actions">
              <button type="button" className="secondary-btn" onClick={copy}>{copied ? 'Copied!' : 'Copy link'}</button>
              <button type="button" className="secondary-btn" onClick={() => window.print()}>Print QR</button>
            </div>
          </section>
          <section className="spot-checkin-card">
            <h3>Visitor notes ({entries.length})</h3>
            <p className="spot-checkin-hint">Notes and optional names are public. Do not share private or sensitive information.</p>
            {entries.length === 0 ? <p>No check-ins yet.</p> : (
              <ol className="spot-checkin-visits">
                {entries.map((entry, index) => {
                  const message = parseMessage(entry.comment);
                  return (
                    <li key={entry.user + '-' + entry.timestamp.toString() + '-' + index}>
                      <div className="spot-checkin-visit-heading">
                        <strong>{message.name || 'Visitor'}</strong>
                        <time>{new Date(Number(entry.timestamp / 1_000_000n)).toLocaleString()}</time>
                      </div>
                      {message.note && <p>{message.note}</p>}
                      {message.photoUrl && <CheckinPhoto url={message.photoUrl} label="Photo from this Spot check-in" />}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}
