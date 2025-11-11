import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAlltracks, useGlobalContext } from '../components/Store';
import { useNotification } from '../context/NotificationContext';
import './Spots.css';

type Spot = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  tags?: string[];
  description?: string;
};

export default function Spots() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [descriptionText, setDescriptionText] = useState('');
  const alltracks = useAlltracks();
  const { state: { principal } } = useGlobalContext();
  const { showNotification } = useNotification();

  const load = async () => {
    try {
      const serverSpots: any[] = await alltracks.getSpots(0, 100);
      // map to local shape, parse coords from description if present
      const mapped = (serverSpots || []).map(s => {
        let latitude = 0, longitude = 0, timestamp = s.createdAt || Date.now();
        try {
          const parsed = JSON.parse(s.description || '{}');
          latitude = parsed.latitude || 0;
          longitude = parsed.longitude || 0;
        } catch (e) {
          // ignore
        }
        return {
          id: s.name,
          name: s.name,
          latitude,
          longitude,
          timestamp,
          description: s.description || '',
          tags: s.tags || []
        } as Spot;
      });
      setSpots(mapped.sort((a, b) => b.timestamp - a.timestamp));
    } catch (err) {
      console.error('Failed to load spots from backend', err);
      setSpots([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addCurrentLocation = async () => {
    setAdding(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });
      const spotName = name || `Spot ${new Date().toLocaleString()}`;
      // store coordinates and user description together in the description field as JSON
      const description = JSON.stringify({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, note: descriptionText || '' });
      const tagsArray = (tagsInput || '').split(',').map(t => t.trim()).filter(Boolean);
      
      const newSpot = { name: spotName, description, tags: tagsArray }
      console.log('Creating spot:', newSpot);
      const result: any = await alltracks.createSpot(newSpot);
      // canister returns { ok: Spot } or { err: string }
      if (result && result.ok) {
        // success
        setName('');
        setTagsInput('');
        setDescriptionText('');
        showNotification('Spot created', 'success');
        await load();
      } else {
        console.error('createSpot failed', result);
        const msg = result?.err || 'Unknown error creating spot';
        showNotification('Failed to create spot: ' + msg, 'error');
      }
    } catch (err) {
      console.error('Failed to add spot to backend', err);
      alert('Unable to save spot.');
    } finally {
      setAdding(false);
    }
  };

  const remove = async (nameKey: string) => {
    if (!confirm('Delete this spot?')) return;
    try {
      await alltracks.deleteSpot(nameKey);
      await load();
    } catch (err) {
      console.error('Failed to delete spot', err);
      showNotification('Unable to delete spot.', 'error');
    }
  };

  return (
    <div className="page-container">
      <h2>Spots</h2>
      <div className="add-spot-controls" style={{ marginBottom: 12 }}>
        <div className="form-field">
          <label className="form-label">Name</label>
          <input aria-label="Spot name" className="spot-name-input" placeholder="Spot name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="form-field">
          <label className="form-label">Tags</label>
          <input aria-label="Tags" className="spot-tags-input" placeholder="e.g. scenic,waterfall" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} />
        </div>

        <div className="form-field">
          <label className="form-label">Description</label>
          <input aria-label="Description" className="spot-desc-input" placeholder="Short description (optional)" value={descriptionText} onChange={(e) => setDescriptionText(e.target.value)} />
        </div>

        <div className="form-field actions-field">
          <button className="primary-btn compact" onClick={addCurrentLocation} disabled={adding}>
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>

      {spots.length === 0 && <p>No spots yet.</p>}

      <ul>
        {spots.map((s) => (
          <li key={s.id} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Link to={`/spots/${encodeURIComponent(s.name)}`}>{s.name || 'Unnamed spot'}</Link>
              {s.tags && s.tags.length > 0 && (
                <div className="tags-row">
                  {s.tags.map((t: string) => (
                    <span key={t} className="tag-chip">{t}</span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <span style={{ color: '#666' }}>{new Date(s.timestamp).toLocaleString()}</span>
              <button onClick={() => remove(s.name)} style={{ marginLeft: 12 }}>Delete</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
