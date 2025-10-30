import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { getAllSpotsFromIndexDB, saveSpotToIndexDB, clearSpotFromIndexDB } from '../utils/IndexDBHandler';
import './Spots.css';

type Spot = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  timestamp: number;
};

export default function Spots() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const load = async () => {
    const all = await getAllSpotsFromIndexDB();
    setSpots(all.sort((a: any, b: any) => b.timestamp - a.timestamp));
  };

  useEffect(() => {
    load();
  }, []);

  const addCurrentLocation = async () => {
    setAdding(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });
      const id = uuidv4();
      const spot: Spot = {
        id,
        name: name || `Spot ${new Date().toLocaleString()}`,
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        timestamp: Date.now(),
      };
      await saveSpotToIndexDB(spot);
      setName('');
      await load();
    } catch (err) {
      console.error('Failed to get current location', err);
      alert('Unable to get current location. Please ensure location access is allowed.');
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this spot?')) return;
    await clearSpotFromIndexDB(id);
    await load();
  };

  return (
    <div className="page-container">
      <h2>Spots</h2>
      <div className="add-spot-controls" style={{ marginBottom: 12 }}>
        <input className="spot-name-input" placeholder="Spot name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="primary-btn" onClick={addCurrentLocation} disabled={adding}>
          {adding ? 'Adding…' : 'Add current location'}
        </button>
      </div>

      {spots.length === 0 && <p>No spots yet.</p>}

      <ul>
        {spots.map((s) => (
          <li key={s.id} style={{ marginBottom: 8 }}>
            <Link to={`/spots/${s.id}`}>{s.name || 'Unnamed spot'}</Link>
            {' — '}
            <span style={{ color: '#666' }}>{new Date(s.timestamp).toLocaleString()}</span>
            <button onClick={() => remove(s.id)} style={{ marginLeft: 12 }}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
