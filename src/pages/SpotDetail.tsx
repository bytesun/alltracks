import React, { useEffect, useState } from 'react';
import './Spots.css';
import { useParams, useNavigate } from 'react-router-dom';
import { getSpotFromIndexDB, getCommentsForSpot, saveCommentToIndexDB, clearSpotFromIndexDB } from '../utils/IndexDBHandler';

type Spot = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  timestamp: number;
};

export default function SpotDetail() {
  const { spotId } = useParams();
  const navigate = useNavigate();
  const [spot, setSpot] = useState<Spot | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!spotId) return;
    const s = await getSpotFromIndexDB(spotId);
    setSpot(s || null);
    const cs = await getCommentsForSpot(spotId);
    setComments(cs || []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotId]);

  const copyLink = async () => {
    if (!spotId) return;
    const url = `${window.location.origin}/spots/${spotId}`;
    try {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard');
    } catch (err) {
      console.error('Copy failed', err);
      prompt('Copy this link', url);
    }
  };

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
    await clearSpotFromIndexDB(spotId);
    navigate('/spots');
  };

  if (!spot) return <div className="page-container"><p>Loading spot…</p></div>;

  return (
    <div className="page-container">
      <h2>{spot.name || 'Unnamed spot'}</h2>
      <div style={{ marginBottom: 8 }}>
        <strong>Coordinates:</strong> {spot.latitude.toFixed(6)}, {spot.longitude.toFixed(6)}
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>Created:</strong> {new Date(spot.timestamp).toLocaleString()}
      </div>
      <div style={{ marginBottom: 12 }}>
        <button onClick={copyLink}>Copy share link</button>
        <button onClick={removeSpot} style={{ marginLeft: 8 }}>Delete spot</button>
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

      <div className="comment-block">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} />
        <button className="primary-btn" onClick={addComment} disabled={saving || !text.trim()}>{saving ? 'Saving…' : 'Add comment'}</button>
      </div>
    </div>
  );
}
