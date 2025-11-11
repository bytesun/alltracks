import React, { useEffect, useState } from 'react';
import './Spots.css';
import { useParams, useNavigate } from 'react-router-dom';
import { useAlltracks, useGlobalContext } from '../components/Store';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { locationIcon } from '../lib/markerIcons';
import { getCommentsForSpot, saveCommentToIndexDB } from '../utils/IndexDBHandler';

type Spot = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  tags?: string[];
  description?: string;
};

export default function SpotDetail() {
  const { spotId } = useParams();
  const navigate = useNavigate();
  const [spot, setSpot] = useState<Spot | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const alltracks = useAlltracks();
  const { state: { isAuthed } } = useGlobalContext();

  const load = async () => {
    if (!spotId) return;
    // spotId is the stringified SpotV2.id (bigint) from the list view
    const idStr = decodeURIComponent(spotId);
    try {
      const idBig = BigInt(idStr);
      const s = await alltracks.getSpotById(idBig);
      if (s && s.length > 0) {
        const sp = s[0];
        let latitude = 0, longitude = 0;
        let note = '';
        try {
          const parsed = JSON.parse(sp.description || '{}');
          latitude = parsed.latitude || 0;
          longitude = parsed.longitude || 0;
          note = parsed.note || '';
        } catch (e) {
          // if description isn't JSON, use raw text
          note = sp.description || '';
        }
        // normalize createdAt (bigint/string/object) to a millisecond number
        const normalizeTime = (raw: any): number => {
          if (raw === undefined || raw === null) return Date.now();
          try {
            let n: number;
            if (typeof raw === 'bigint') n = Number(raw);
            else if (typeof raw === 'string' && /^\d+$/.test(raw)) n = Number(raw);
            else if (typeof raw === 'object' && raw.toString) n = Number(raw.toString());
            else n = Number(raw);
            if (!Number.isFinite(n)) return Date.now();
            if (n > 1e14) return Math.floor(n / 1e6);
            if (n > 1e9 && n < 1e11) return Math.floor(n * 1000);
            if (n <= 0) return Date.now();
            return Math.floor(n);
          } catch (e) {
            return Date.now();
          }
        };

        const timestamp = normalizeTime((sp as any).createdAt);
        setSpot({ id: String(sp.id), name: sp.name, latitude, longitude, timestamp, tags: sp.tags || [], description: note } as any);
      } else {
        setSpot(null);
      }
    } catch (err) {
      console.error('Failed to load spot from backend', err);
      setSpot(null);
    }
    const cs = await getCommentsForSpot(spotId);
    setComments(cs || []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotId]);

  const addComment = async () => {
    if (!spotId || !text.trim()) return;
    setSaving(true);
    try {
      await saveCommentToIndexDB(spotId, { author: 'Anonymous', text: text.trim(), timestamp: Date.now() });
      setText('');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const removeSpot = async () => {
    if (!spotId) return;
    if (!confirm('Delete this spot?')) return;
    // delete by spot name (backend deleteSpot expects the name)
    const name = spot?.name || decodeURIComponent(spotId);
    try {
      await alltracks.deleteSpot(name);
    } catch (err) {
      console.error('Failed to delete spot', err);
      alert('Unable to delete spot.');
    }
    navigate('/spots');
  };

  if (!spot) return <div className="page-container"><p>Loading spot…</p></div>;

  return (
    <div className="page-container">
      <h2>{spot.name || 'Unnamed spot'}</h2>
      {spot.tags && spot.tags.length > 0 && (
        <div className="tags-row" style={{ marginBottom: 8 }}>
          {spot.tags.map((t: string) => <span key={t} className="tag-chip">{t}</span>)}
        </div>
      )}
      {spot.description && <div className="spot-desc" style={{ marginBottom: 8 }}>{spot.description}</div>}
      {spot.latitude !== 0 && spot.longitude !== 0 && (
        <div className="spot-map" style={{ marginBottom: 8 }}>
          <MapContainer center={[spot.latitude, spot.longitude]} zoom={15} style={{ height: '240px', width: '100%' }} scrollWheelZoom={false}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[spot.latitude, spot.longitude]} icon={locationIcon}>
              <Popup>{spot.name}</Popup>
            </Marker>
          </MapContainer>
        </div>
      )}
      <div style={{ marginBottom: 8 }}>
        <strong>Coordinates:</strong> {spot.latitude.toFixed(6)}, {spot.longitude.toFixed(6)}
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>Created:</strong> {new Date(spot.timestamp).toLocaleString()}
      </div>
      <div style={{ marginBottom: 12 }}>
        {isAuthed && (
          <button onClick={removeSpot} style={{ marginLeft: 8 }}>Delete spot</button>
        )}
      </div>

      <h3>Comments</h3>
      {comments.length === 0 && <p>No comments yet.</p>}
      <ul>
        {comments.map((c: any, i: number) => (
          <li key={i} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 14 }}>{c.text}</div>
            <div style={{ color: '#666', fontSize: 12 }}>{c.author} — {new Date(c.timestamp).toLocaleString()}</div>
          </li>
        ))}
      </ul>

      {isAuthed && (
        <div className="comment-block">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
          <button className="primary-btn" onClick={addComment} disabled={saving || !text.trim()}>{saving ? 'Saving…' : 'Add comment'}</button>
        </div>
      )}
    </div>
  );
}
