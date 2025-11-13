import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAlltracks, useGlobalContext } from '../components/Store';
import { useNotification } from '../context/NotificationContext';
import './Spots.css';
import { ConfirmationModal } from '../components/ConfirmationModal';

type Spot = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  tags?: string[];
  description?: string;
  createdBy?: string;
};

export default function Spots() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [descriptionText, setDescriptionText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [shownSpots, setShownSpots] = useState<Spot[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const alltracks = useAlltracks();
  const { state: { principal, isAuthed } } = useGlobalContext();
  const { showNotification } = useNotification();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTargetName, setConfirmTargetName] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const serverSpots: any[] = await alltracks.getSpots(0, 100);
      // map to local shape, parse coords from description if present
      const normalizeTime = (raw: any): number => {
        if (raw === undefined || raw === null) return Date.now();
        try {
          let n: number;
          if (typeof raw === 'bigint') n = Number(raw);
          else if (typeof raw === 'string' && /^\d+$/.test(raw)) n = Number(raw);
          else if (typeof raw === 'object' && raw.toString) n = Number(raw.toString());
          else n = Number(raw);
          if (!Number.isFinite(n)) return Date.now();
          // normalize: if value looks like nanoseconds (very large), convert to ms
          if (n > 1e14) return Math.floor(n / 1e6);
          // if value looks like seconds (10-digit), convert to ms
          if (n > 1e9 && n < 1e11) return Math.floor(n * 1000);
          if (n <= 0) return Date.now();
          return Math.floor(n);
        } catch (e) {
          return Date.now();
        }
      };

      const mapped = (serverSpots || []).map(s => {
        let latitude = 0, longitude = 0;
        const timestamp: number = normalizeTime(s?.createdAt);
        try {
          const parsed = JSON.parse(s.description || '{}');
          latitude = parsed.latitude || 0;
          longitude = parsed.longitude || 0;
        } catch (e) {
          // ignore
        }
        return {
          // use the backend SpotV2.id (bigint) as the unique id
          id: String(s.id ?? s.name),
          name: s.name,
          latitude,
          longitude,
          timestamp,
          description: s.description || '',
          tags: s.tags || [],
          createdBy: s.createdBy.toText() || ''
        } as Spot;
      });
      setSpots(mapped.sort((a, b) => b.timestamp - a.timestamp));
      setShownSpots(mapped.sort((a, b) => b.timestamp - a.timestamp));
    } catch (err) {
      console.error('Failed to load spots from backend', err);
      setSpots([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // server-backed search: debounce input and call canister searchSpotsByTag
  useEffect(() => {
    const t = setTimeout(async () => {
      const q = (searchTerm || '').trim();
      if (!q) {
        setShownSpots(spots);
        return;
      }
      setIsSearching(true);
      try {
        // call canister searchSpotsByTag(tag, page, pageSize)
        // backend expects (string, bigint, bigint)
        const res: any[] = await alltracks.searchSpotsByTag(q, BigInt(0), BigInt(100));
        // map SpotV2 -> Spot
        const mapped = (res || []).map((s: any) => {
          let latitude = 0, longitude = 0;
          try {
            const parsed = JSON.parse(s.description || '{}');
            latitude = parsed.latitude || 0;
            longitude = parsed.longitude || 0;
          } catch (e) { }
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
          return {
            id: String(s.id ?? s.name),
            name: s.name,
            latitude,
            longitude,
            timestamp: normalizeTime(s.createdAt),
            description: s.description || '',
            tags: s.tags || []
          } as Spot;
        });
        setShownSpots(mapped.sort((a, b) => b.timestamp - a.timestamp));
      } catch (err) {
        console.error('Server search failed', err);
        showNotification('Server search failed', 'error');
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchTerm, alltracks, spots, showNotification]);

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
    // open confirmation modal
    setConfirmTargetName(nameKey);
    setConfirmOpen(true);
  };

  const performDelete = async () => {
    if (!confirmTargetName) return;
    setDeleting(true);
    try {
      await alltracks.deleteSpot(confirmTargetName);
      setConfirmOpen(false);
      setConfirmTargetName(null);
      await load();
      showNotification('Spot deleted', 'success');
    } catch (err) {
      console.error('Failed to delete spot', err);
      showNotification('Unable to delete spot.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-container">
      <h2>Spots</h2>
      <h5>Share your favorate spots (e.g fishing, camping, swimming...)</h5>
      {/* <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          aria-label="Search spots"
          className="spot-search-input"
          placeholder="Search by name, tag or description"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button className="primary-btn" onClick={() => setSearchTerm('')}>Clear</button>
        )}
      </div> */}
      {isAuthed && (
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
      )}

      {spots.length === 0 && <p>No spots yet.</p>}

      <ul>
        {spots
          .filter((s) => {
            if (!searchTerm) return true;
            const q = searchTerm.toLowerCase();
            if ((s.name || '').toLowerCase().includes(q)) return true;
            if ((s.description || '').toLowerCase().includes(q)) return true;
            if (s.tags && s.tags.join(' ').toLowerCase().includes(q)) return true;
            return false;
          })
          .map((s) => (
            <li key={s.id} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link to={`/spots/${encodeURIComponent(s.id)}`}>{s.name || 'Unnamed spot'}</Link>
                {s.tags && s.tags.length > 0 && (
                  <div className="tags-row">
                    {s.tags.map((t: string) => (
                      <span key={t} className="tag-chip">{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                {/* <span style={{ color: '#666' }}>{new Date(s.timestamp).toLocaleString()}</span> */}
                {isAuthed && s.createdBy == principal.toText() && (
                  <button onClick={() => remove(s.name)} className="primary-btn compact"  disabled={deleting && confirmTargetName === s.name}>
                    {deleting && confirmTargetName === s.name ? 'Deleting…' : 'Delete'}                    
                  </button>
                )}
              </div>
            </li>
          ))}
      </ul>
      {confirmOpen && (
        <ConfirmationModal
          message={`Delete spot "${confirmTargetName}"? This action cannot be undone.`}
          onConfirm={performDelete}
          onCancel={() => { setConfirmOpen(false); setConfirmTargetName(null); }}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
    </div>
  );
}
