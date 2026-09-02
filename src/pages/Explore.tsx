import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { divIcon } from 'leaflet';
import type { LatLngBounds, LatLngTuple } from 'leaflet';
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { useAlltracks } from '../components/Store';
import { parseTrailFile, parseTrails } from '../utils/trailUtils';
import type { Trail } from '../types/Trail';
import './Explore.css';

type LayerKey = 'trails' | 'spots' | 'conditions';

type ViewportBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

type ExploreSpot = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  latitude: number;
  longitude: number;
  timestamp: number;
};

type ExploreCondition = {
  id: string;
  note: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  category: string;
  severity: string;
};

const DEFAULT_CENTER: LatLngTuple = [49.2827, -123.1207];
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const trailIcon = divIcon({
  className: 'explore-layer-marker',
  html: '<span class="explore-map-pin explore-map-pin--trail">🥾</span>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const spotIcon = divIcon({
  className: 'explore-layer-marker',
  html: '<span class="explore-map-pin explore-map-pin--spot">●</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const conditionIcon = divIcon({
  className: 'explore-layer-marker',
  html: '<span class="explore-map-pin explore-map-pin--condition">!</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

const userIcon = divIcon({
  className: 'explore-layer-marker',
  html: '<span class="explore-map-pin explore-map-pin--user">◎</span>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const normalizeTime = (raw: unknown): number => {
  if (raw === undefined || raw === null) return Date.now();
  try {
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return Date.now();
    if (value > 1e14) return Math.floor(value / 1e6);
    if (value > 1e9 && value < 1e11) return Math.floor(value * 1000);
    return Math.floor(value);
  } catch {
    return Date.now();
  }
};

const parseSpotDescription = (value: unknown) => {
  const raw = typeof value === 'string' ? value : '';
  if (!raw) return { latitude: 0, longitude: 0, note: '' };

  try {
    const parsed = JSON.parse(raw);
    return {
      latitude: Number(parsed?.latitude) || 0,
      longitude: Number(parsed?.longitude) || 0,
      note: typeof parsed?.note === 'string' ? parsed.note : raw,
    };
  } catch {
    return { latitude: 0, longitude: 0, note: raw };
  }
};

const variantName = (value: unknown): string => {
  if (!value || typeof value !== 'object') return '';
  return Object.keys(value as Record<string, unknown>)[0] || '';
};

const formatAge = (timestamp: number) => {
  const diff = Math.max(0, Date.now() - timestamp);
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 1) return 'Recently';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const isInsideViewport = (latitude: number, longitude: number, bounds: ViewportBounds | null) => {
  if (!bounds) return true;
  const latitudeMatches = latitude >= bounds.south && latitude <= bounds.north;
  const longitudeMatches = bounds.west <= bounds.east
    ? longitude >= bounds.west && longitude <= bounds.east
    : longitude >= bounds.west || longitude <= bounds.east;
  return latitudeMatches && longitudeMatches;
};

const MapFocus: React.FC<{ center: LatLngTuple; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [map, center, zoom]);

  return null;
};

const MapViewportEvents: React.FC<{ onBoundsChange: (bounds: LatLngBounds) => void }> = ({
  onBoundsChange,
}) => {
  const map = useMapEvents({
    moveend: () => onBoundsChange(map.getBounds()),
  });

  useEffect(() => {
    onBoundsChange(map.getBounds());
  }, [map, onBoundsChange]);

  return null;
};

const Explore: React.FC = () => {
  const alltracks = useAlltracks();
  const [trails, setTrails] = useState<Trail[]>([]);
  const [spots, setSpots] = useState<ExploreSpot[]>([]);
  const [conditions, setConditions] = useState<ExploreCondition[]>([]);
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds | null>(null);
  const [enabledLayers, setEnabledLayers] = useState<Record<LayerKey, boolean>>({
    trails: true,
    spots: true,
    conditions: true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [mapCenter, setMapCenter] = useState<LatLngTuple>(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(9);
  const [userLocation, setUserLocation] = useState<LatLngTuple | null>(null);
  const [selectedTrailId, setSelectedTrailId] = useState<string | null>(null);
  const [selectedTrailPath, setSelectedTrailPath] = useState<LatLngTuple[]>([]);
  const [isLoadingShared, setIsLoadingShared] = useState(true);
  const [isLoadingTrails, setIsLoadingTrails] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [message, setMessage] = useState('');
  const trailRequestRef = useRef(0);
  const trailPreviewRequestRef = useRef(0);

  const clearTrailPreview = () => {
    trailPreviewRequestRef.current += 1;
    setSelectedTrailId(null);
    setSelectedTrailPath([]);
  };

  const loadSharedLayers = useCallback(async () => {
    setIsLoadingShared(true);
    setMessage('');

    const now = Date.now();
    const results = await Promise.allSettled([
      alltracks.getSpots(0n, 200n),
      alltracks.getIncidentCheckpoints(BigInt(now - THIRTY_DAYS_MS), BigInt(now)),
    ]);

    const [spotsResult, conditionsResult] = results;
    const errors: string[] = [];

    if (spotsResult.status === 'fulfilled') {
      const mapped = (spotsResult.value || []).map((spot: any) => {
        const parsed = parseSpotDescription(spot?.description);
        const timestamp = normalizeTime(spot?.createdAt);
        return {
          id: String(spot?.id ?? `${spot?.name || 'spot'}-${timestamp}`),
          name: spot?.name || 'Unnamed spot',
          description: parsed.note,
          tags: Array.isArray(spot?.tags) ? spot.tags : [],
          latitude: parsed.latitude,
          longitude: parsed.longitude,
          timestamp,
        } as ExploreSpot;
      });
      setSpots(mapped.filter((spot) => spot.latitude !== 0 && spot.longitude !== 0));
    } else {
      errors.push('spots');
    }

    if (conditionsResult.status === 'fulfilled') {
      const mapped = (conditionsResult.value || []).map((condition: any, index: number) => ({
        id: `${String(condition?.trackId || 'condition')}-${String(condition?.timestamp || index)}`,
        note: condition?.note || 'Field condition',
        latitude: Number(condition?.latitude) || 0,
        longitude: Number(condition?.longitude) || 0,
        timestamp: normalizeTime(condition?.timestamp),
        category: variantName(condition?.category) || 'condition',
        severity: variantName(condition?.severity) || 'unknown',
      }));
      setConditions(mapped.filter((condition) => condition.latitude !== 0 && condition.longitude !== 0));
    } else {
      errors.push('conditions');
    }

    if (errors.length > 0) {
      setMessage(`Some Explore data could not be loaded: ${errors.join(', ')}.`);
    }
    setIsLoadingShared(false);
  }, [alltracks]);

  useEffect(() => {
    loadSharedLayers();
  }, [loadSharedLayers]);

  const loadTrailsInBounds = useCallback(
    async (bounds: LatLngBounds) => {
      const requestId = ++trailRequestRef.current;
      setIsLoadingTrails(true);

      try {
        const result = await alltracks.getTrailsInBounds({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        });
        if (requestId !== trailRequestRef.current) return;
        setTrails(parseTrails(result));
      } catch (error) {
        if (requestId !== trailRequestRef.current) return;
        console.error('Unable to load trails for Explore map', error);
        setMessage('Unable to load trails in this map area. Move the map or try again.');
      } finally {
        if (requestId === trailRequestRef.current) setIsLoadingTrails(false);
      }
    },
    [alltracks],
  );

  const handleBoundsChange = useCallback(
    (bounds: LatLngBounds) => {
      setViewportBounds({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
      loadTrailsInBounds(bounds);
    },
    [loadTrailsInBounds],
  );

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredTrails = useMemo(
    () =>
      trails.filter((trail) => {
        if (!normalizedSearch) return true;
        return [trail.name, trail.description, trail.difficulty, trail.routeType, ...(trail.tags || [])]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      }),
    [trails, normalizedSearch],
  );

  const filteredSpots = useMemo(
    () =>
      spots.filter((spot) => {
        if (!isInsideViewport(spot.latitude, spot.longitude, viewportBounds)) return false;
        if (!normalizedSearch) return true;
        return [spot.name, spot.description, ...(spot.tags || [])]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      }),
    [spots, normalizedSearch, viewportBounds],
  );

  const filteredConditions = useMemo(
    () =>
      conditions.filter((condition) => {
        if (!isInsideViewport(condition.latitude, condition.longitude, viewportBounds)) return false;
        if (!normalizedSearch) return true;
        return [condition.note, condition.category, condition.severity]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);
      }),
    [conditions, normalizedSearch, viewportBounds],
  );

  const focusLocation = (latitude: number, longitude: number, zoom = 13) => {
    setMapCenter([latitude, longitude]);
    setMapZoom(zoom);
  };

  const selectTrail = async (trail: Trail) => {
    const requestId = ++trailPreviewRequestRef.current;
    const trailId = String(trail.id);
    setSelectedTrailId(trailId);
    setSelectedTrailPath([]);
    focusLocation(trail.startPoint.latitude, trail.startPoint.longitude, 13);

    try {
      const path = await parseTrailFile(trail.trailfile.url, trail.trailfile.fileType);
      if (requestId === trailPreviewRequestRef.current) setSelectedTrailPath(path);
    } catch (error) {
      if (requestId !== trailPreviewRequestRef.current) return;
      console.error('Unable to preview trail route', error);
      setSelectedTrailPath([]);
    }
  };

  const toggleLayer = (layer: LayerKey) => {
    setEnabledLayers((current) => ({ ...current, [layer]: !current[layer] }));
    if (layer === 'trails' && enabledLayers.trails) clearTrailPreview();
  };

  const centerNearMe = () => {
    if (!navigator.geolocation) {
      setMessage('Location is not available in this browser.');
      return;
    }

    setIsLocating(true);
    setMessage('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next: LatLngTuple = [position.coords.latitude, position.coords.longitude];
        setUserLocation(next);
        setMapCenter(next);
        setMapZoom(12);
        setIsLocating(false);
      },
      () => {
        setMessage('Unable to use your location. Check browser location permission and try again.');
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const visibleCount =
    (enabledLayers.trails ? filteredTrails.length : 0) +
    (enabledLayers.spots ? filteredSpots.length : 0) +
    (enabledLayers.conditions ? filteredConditions.length : 0);

  return (
    <main className="explore-page">
      <section className="explore-hero explore-hero--compact">
        <p className="explore-eyebrow">Explore outdoors</p>
        <h1>One map for the outing ahead.</h1>
        <p>
          Move the map to discover trails, layer in useful spots, and check recent field conditions before you go.
        </p>
      </section>

      <section className="explore-toolbar" aria-label="Explore controls">
        <label className="explore-search">
          <span className="material-icons" aria-hidden="true">search</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search this map"
            aria-label="Search trails, spots, and conditions"
          />
        </label>

        <div className="explore-layer-switches" aria-label="Map layers">
          <button
            type="button"
            className={`explore-layer-toggle explore-layer-toggle--trail ${enabledLayers.trails ? 'is-active' : ''}`}
            aria-pressed={enabledLayers.trails}
            onClick={() => toggleLayer('trails')}
          >
            <span>🥾</span> Trails <strong>{filteredTrails.length}</strong>
          </button>
          <button
            type="button"
            className={`explore-layer-toggle explore-layer-toggle--spot ${enabledLayers.spots ? 'is-active' : ''}`}
            aria-pressed={enabledLayers.spots}
            onClick={() => toggleLayer('spots')}
          >
            <span>●</span> Spots <strong>{filteredSpots.length}</strong>
          </button>
          <button
            type="button"
            className={`explore-layer-toggle explore-layer-toggle--condition ${enabledLayers.conditions ? 'is-active' : ''}`}
            aria-pressed={enabledLayers.conditions}
            onClick={() => toggleLayer('conditions')}
          >
            <span>!</span> Conditions <strong>{filteredConditions.length}</strong>
          </button>
        </div>

        <button type="button" className="explore-near-me" onClick={centerNearMe} disabled={isLocating}>
          <span className="material-icons" aria-hidden="true">my_location</span>
          {isLocating ? 'Locating…' : 'Near me'}
        </button>
      </section>

      {message && (
        <div className="explore-message" role="status">
          <span className="material-icons" aria-hidden="true">info</span>
          {message}
        </div>
      )}

      <section className="explore-workspace">
        <div className="explore-map-shell">
          <div className="explore-map-meta">
            <span>{visibleCount} visible item{visibleCount === 1 ? '' : 's'}</span>
            {(isLoadingShared || isLoadingTrails) && (
              <span className="explore-loading">
                <span className="material-icons spinning" aria-hidden="true">refresh</span>
                Updating
              </span>
            )}
          </div>

          <MapContainer center={mapCenter} zoom={mapZoom} className="explore-map" scrollWheelZoom>
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapFocus center={mapCenter} zoom={mapZoom} />
            <MapViewportEvents onBoundsChange={handleBoundsChange} />

            {userLocation && (
              <Marker position={userLocation} icon={userIcon}>
                <Popup>Your location</Popup>
              </Marker>
            )}

            {enabledLayers.trails &&
              filteredTrails.map((trail) => (
                <Marker
                  key={`trail-${String(trail.id)}`}
                  position={[trail.startPoint.latitude, trail.startPoint.longitude]}
                  icon={trailIcon}
                  eventHandlers={{ click: () => selectTrail(trail) }}
                >
                  <Popup>
                    <div className="explore-popup">
                      <strong>{trail.name}</strong>
                      <span>
                        {trail.distance} km · {trail.elevationGain} m gain · {trail.difficulty}
                      </span>
                      <Link to={`/trail/${trail.id}`}>Open trail</Link>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {enabledLayers.trails && selectedTrailPath.length > 1 && (
              <Polyline positions={selectedTrailPath} pathOptions={{ color: '#287a50', weight: 5, opacity: 0.9 }} />
            )}

            {enabledLayers.spots &&
              filteredSpots.map((spot) => (
                <Marker
                  key={`spot-${spot.id}`}
                  position={[spot.latitude, spot.longitude]}
                  icon={spotIcon}
                  eventHandlers={{ click: clearTrailPreview }}
                >
                  <Popup>
                    <div className="explore-popup">
                      <strong>{spot.name}</strong>
                      {spot.description && <span>{spot.description}</span>}
                      <span>{formatAge(spot.timestamp)}</span>
                      <Link to={`/spots/${encodeURIComponent(spot.id)}`}>Open spot</Link>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {enabledLayers.conditions &&
              filteredConditions.map((condition) => (
                <Marker
                  key={`condition-${condition.id}`}
                  position={[condition.latitude, condition.longitude]}
                  icon={conditionIcon}
                  eventHandlers={{ click: clearTrailPreview }}
                >
                  <Popup>
                    <div className="explore-popup">
                      <strong>{condition.note}</strong>
                      <span>
                        {condition.category} · {condition.severity} · {formatAge(condition.timestamp)}
                      </span>
                      <Link to="/status">Open Conditions</Link>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        </div>

        <aside className="explore-results" aria-label="Explore map results">
          {enabledLayers.trails && (
            <div className="explore-result-group">
              <div className="explore-result-heading">
                <div>
                  <span className="explore-result-dot explore-result-dot--trail" />
                  <strong>Trails</strong>
                </div>
                <Link to="/trails">All trails</Link>
              </div>
              {filteredTrails.length === 0 ? (
                <p className="explore-empty">Move the map or change your search.</p>
              ) : (
                filteredTrails.slice(0, 8).map((trail) => (
                  <button
                    type="button"
                    key={String(trail.id)}
                    className={`explore-result-item ${selectedTrailId === String(trail.id) ? 'is-selected' : ''}`}
                    onClick={() => selectTrail(trail)}
                  >
                    <span className="explore-result-title">{trail.name}</span>
                    <span className="explore-result-meta">
                      {trail.distance} km · {trail.elevationGain} m · {trail.difficulty}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          {enabledLayers.spots && (
            <div className="explore-result-group">
              <div className="explore-result-heading">
                <div>
                  <span className="explore-result-dot explore-result-dot--spot" />
                  <strong>Spots</strong>
                </div>
                <Link to="/spots">All spots</Link>
              </div>
              {filteredSpots.length === 0 ? (
                <p className="explore-empty">No matching spots in this view.</p>
              ) : (
                filteredSpots.slice(0, 8).map((spot) => (
                  <button
                    type="button"
                    key={spot.id}
                    className="explore-result-item"
                    onClick={() => {
                      focusLocation(spot.latitude, spot.longitude, 14);
                      clearTrailPreview();
                    }}
                  >
                    <span className="explore-result-title">{spot.name}</span>
                    <span className="explore-result-meta">
                      {spot.tags.length > 0 ? spot.tags.slice(0, 3).join(' · ') : formatAge(spot.timestamp)}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          {enabledLayers.conditions && (
            <div className="explore-result-group">
              <div className="explore-result-heading">
                <div>
                  <span className="explore-result-dot explore-result-dot--condition" />
                  <strong>Conditions</strong>
                </div>
                <Link to="/status">All conditions</Link>
              </div>
              {filteredConditions.length === 0 ? (
                <p className="explore-empty">No recent matching reports in this view.</p>
              ) : (
                filteredConditions.slice(0, 8).map((condition) => (
                  <button
                    type="button"
                    key={condition.id}
                    className="explore-result-item"
                    onClick={() => {
                      focusLocation(condition.latitude, condition.longitude, 14);
                      clearTrailPreview();
                    }}
                  >
                    <span className="explore-result-title">{condition.note}</span>
                    <span className="explore-result-meta">
                      {condition.category} · {condition.severity} · {formatAge(condition.timestamp)}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </aside>
      </section>

      <nav className="explore-deep-links" aria-label="Explore detailed views">
        <Link to="/trails">Trail finder</Link>
        <Link to="/spots">Manage spots</Link>
        <Link to="/status">Conditions detail</Link>
      </nav>
    </main>
  );
};

export default Explore;
