import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { useAlltracks, useGlobalContext } from '../components/Store';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useNotification } from '../context/NotificationContext';
import { locationIcon } from '../lib/markerIcons';
import './Spots.css';

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

const normalizeTime = (raw: unknown): number => {
  if (raw === undefined || raw === null) return Date.now();
  try {
    let n: number;
    if (typeof raw === 'bigint') n = Number(raw);
    else if (typeof raw === 'string' && /^\d+$/.test(raw)) n = Number(raw);
    else if (typeof raw === 'object') n = Number(String(raw));
    else n = Number(raw);

    if (!Number.isFinite(n)) return Date.now();
    if (n > 1e14) return Math.floor(n / 1e6);
    if (n > 1e9 && n < 1e11) return Math.floor(n * 1000);
    if (n <= 0) return Date.now();
    return Math.floor(n);
  } catch {
    return Date.now();
  }
};

const parseSpotDescription = (value: unknown): { latitude: number; longitude: number; note: string } => {
  const raw = typeof value === 'string' ? value : '';
  if (!raw) return { latitude: 0, longitude: 0, note: '' };

  try {
    const parsed = JSON.parse(raw);
    return {
      latitude: Number(parsed?.latitude) || 0,
      longitude: Number(parsed?.longitude) || 0,
      note: typeof parsed?.note === 'string' ? parsed.note : raw
    };
  } catch {
    return { latitude: 0, longitude: 0, note: raw };
  }
};

export default function Spots() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [descriptionText, setDescriptionText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTag, setActiveTag] = useState('all');
  const [onlyMappable, setOnlyMappable] = useState(false);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);

  const alltracks = useAlltracks();
  const {
    state: { principal, isAuthed }
  } = useGlobalContext();
  const { showNotification } = useNotification();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTargetName, setConfirmTargetName] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const serverSpots: any[] = await alltracks.getSpots(0, 100);
      const mapped = (serverSpots || []).map((s) => {
        const parsed = parseSpotDescription(s?.description);
        return {
          id: String(s?.id ?? s?.name),
          name: s?.name || '',
          latitude: parsed.latitude,
          longitude: parsed.longitude,
          timestamp: normalizeTime(s?.createdAt),
          description: parsed.note,
          tags: Array.isArray(s?.tags) ? s.tags : [],
          createdBy: s?.createdBy?.toText?.() || ''
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

  const allTags = useMemo(() => {
    const unique = new Set<string>();
    for (const spot of spots) {
      for (const tag of spot.tags || []) {
        if (tag) unique.add(tag);
      }
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [spots]);

  const filteredSpots = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return spots.filter((spot) => {
      if (activeTag !== 'all' && !(spot.tags || []).includes(activeTag)) return false;
      if (onlyMappable && (spot.latitude === 0 || spot.longitude === 0)) return false;
      if (!q) return true;

      return (
        (spot.name || '').toLowerCase().includes(q) ||
        (spot.description || '').toLowerCase().includes(q) ||
        (spot.tags || []).join(' ').toLowerCase().includes(q)
      );
    });
  }, [spots, searchTerm, activeTag, onlyMappable]);

  const mappableSpots = useMemo(
    () => filteredSpots.filter((spot) => spot.latitude !== 0 && spot.longitude !== 0),
    [filteredSpots]
  );

  const mapCenter = useMemo<[number, number]>(() => {
    const selected = mappableSpots.find((spot) => spot.id === selectedSpotId);
    if (selected) return [selected.latitude, selected.longitude];
    if (mappableSpots.length > 0) return [mappableSpots[0].latitude, mappableSpots[0].longitude];
    return [20, 0];
  }, [mappableSpots, selectedSpotId]);

  useEffect(() => {
    if (selectedSpotId && !filteredSpots.some((spot) => spot.id === selectedSpotId)) {
      setSelectedSpotId(null);
    }
  }, [filteredSpots, selectedSpotId]);

  const addCurrentLocation = async () => {
    setAdding(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });

      const spotName = name || `Spot ${new Date().toLocaleString()}`;
      const description = JSON.stringify({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        note: descriptionText || ''
      });
      const tagsArray = (tagsInput || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      const result: any = await alltracks.createSpot({ name: spotName, description, tags: tagsArray });
      if (result && result.ok) {
        setName('');
        setTagsInput('');
        setDescriptionText('');
        showNotification('Spot created', 'success');
        await load();
      } else {
        const msg = result?.err || 'Unknown error creating spot';
        showNotification(`Failed to create spot: ${msg}`, 'error');
      }
    } catch (err) {
      console.error('Failed to add spot to backend', err);
      showNotification('Unable to save spot.', 'error');
    } finally {
      setAdding(false);
    }
  };

  const remove = async (nameKey: string) => {
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
    <div className="page-container spots-page">
      <div className="spots-header">
        <h2>Spots</h2>
        <p>Save and explore favorite places for fishing, camping, swimming, and more.</p>
      </div>

      {isAuthed && (
        <div className="spots-card add-spot-controls">
          <div className="form-field">
            <label className="form-label">Name</label>
            <input
              aria-label="Spot name"
              className="spot-name-input"
              placeholder="Spot name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label">Tags</label>
            <input
              aria-label="Tags"
              className="spot-tags-input"
              placeholder="e.g. scenic, waterfall"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label">Description</label>
            <input
              aria-label="Description"
              className="spot-desc-input"
              placeholder="Short note (optional)"
              value={descriptionText}
              onChange={(e) => setDescriptionText(e.target.value)}
            />
          </div>

          <div className="form-field actions-field">
            <button className="primary-btn compact" onClick={addCurrentLocation} disabled={adding}>
              {adding ? 'Adding…' : 'Add current location'}
            </button>
          </div>
        </div>
      )}

      <div className="spots-card spots-filters">
        <input
          aria-label="Search spots"
          className="spot-search-input"
          placeholder="Search by name, tag, or description"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="spot-filter-select"
          aria-label="Filter by tag"
          value={activeTag}
          onChange={(e) => setActiveTag(e.target.value)}
        >
          <option value="all">All tags</option>
          {allTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <label className="checkbox-filter">
          <input
            type="checkbox"
            checked={onlyMappable}
            onChange={(e) => setOnlyMappable(e.target.checked)}
          />
          Map-ready only
        </label>
        {(searchTerm || activeTag !== 'all' || onlyMappable) && (
          <button
            className="secondary-btn"
            onClick={() => {
              setSearchTerm('');
              setActiveTag('all');
              setOnlyMappable(false);
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="spots-grid">
        <div className="spots-card map-card">
          <div className="section-title">Map ({mappableSpots.length})</div>
          {mappableSpots.length > 0 ? (
            <div className="spot-map">
              <MapContainer
                center={mapCenter}
                zoom={13}
                style={{ height: '320px', width: '100%' }}
                scrollWheelZoom
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {mappableSpots.map((spot) => (
                  <Marker
                    key={spot.id}
                    position={[spot.latitude, spot.longitude]}
                    icon={locationIcon}
                    eventHandlers={{ click: () => setSelectedSpotId(spot.id) }}
                  >
                    <Popup>
                      <strong>{spot.name || 'Unnamed spot'}</strong>
                      {spot.description ? <div>{spot.description}</div> : null}
                      <div>
                        <Link to={`/spots/${encodeURIComponent(spot.id)}`}>Open detail</Link>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          ) : (
            <p className="empty-state">No mappable spots for the current filters.</p>
          )}
        </div>

        <div className="spots-card list-card">
          <div className="section-title">Spots ({filteredSpots.length})</div>
          {filteredSpots.length === 0 ? (
            <p className="empty-state">No spots found.</p>
          ) : (
            <ul className="spots-list">
              {filteredSpots.map((spot) => {
                const isOwner = !!principal && spot.createdBy === principal.toText();
                const spotTags = spot.tags || [];
                return (
                  <li
                    key={spot.id}
                    className={selectedSpotId === spot.id ? 'is-selected' : ''}
                    onMouseEnter={() => setSelectedSpotId(spot.id)}
                  >
                    <div className="spot-card-content">
                      <div className="spot-title-row">
                        <Link to={`/spots/${encodeURIComponent(spot.id)}`}>{spot.name || 'Unnamed spot'}</Link>
                        {spotTags.length > 0 && (
                          <div className="tags-row">
                            {spotTags.map((tag) => (
                              <span key={tag} className="tag-chip">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {spot.description ? <div className="spot-desc-snippet">{spot.description}</div> : null}
                    </div>
                    <div className="spot-actions">
                      <span className="spot-meta">{new Date(spot.timestamp).toLocaleString()}</span>
                      {isAuthed && isOwner && (
                        <button
                          onClick={() => remove(spot.name)}
                          className="spot-delete-btn"
                          disabled={deleting && confirmTargetName === spot.name}
                        >
                          {deleting && confirmTargetName === spot.name ? 'Deleting…' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {confirmOpen && (
        <ConfirmationModal
          message={`Delete spot "${confirmTargetName}"? This action cannot be undone.`}
          onConfirm={performDelete}
          onCancel={() => {
            setConfirmOpen(false);
            setConfirmTargetName(null);
          }}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
    </div>
  );
}
