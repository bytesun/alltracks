import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import './Trails.css';
import { Trail } from '../types/Trail'

import { useAlltracks } from '../components/Store';
import { parseTrailFile, parseTrails, difficultyMap, routeTypeMap } from '../utils/trailUtils';

import { Map as LeafletMap } from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LatLngTuple } from 'leaflet';
import { Icon } from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

type DifficultyFilter = '' | 'easy' | 'moderate' | 'hard' | 'expert';
type RouteFilter = '' | 'loop' | 'out-and-back' | 'point-to-point';
type SortOption = 'latest' | 'distance' | 'rating';

const PAGE_SIZE = 100n;
const DEFAULT_TRAIL_IMAGE = '/alltracks_hero.png';

export const Trails = () => {
  const alltracks = useAlltracks();
  const [trails, setTrails] = useState<Trail[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyFilter>('');
  const [selectedRouteType, setSelectedRouteType] = useState<RouteFilter>('');
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const mapRef = useRef<LeafletMap>(null);
  const [selectedTrailId, setSelectedTrailId] = useState<number | null>(null);
  const [trailPath, setTrailPath] = useState<LatLngTuple[]>([]);

  const [defaultCenter, setDefaultCenter] = useState<LatLngTuple>([49.2827, -123.1207]);
  const customIcon = new Icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
  });

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setDefaultCenter([latitude, longitude] as LatLngTuple);
      });
    }
  }, []);

  const sortTrails = useCallback((items: Trail[]) => {
    return [...items].sort((a, b) => {
      if (sortBy === 'distance') {
        return a.distance - b.distance;
      }

      if (sortBy === 'rating') {
        return b.rating - a.rating;
      }

      const aCreated = a.createdAt || Number(a.id);
      const bCreated = b.createdAt || Number(b.id);
      return bCreated - aCreated;
    });
  }, [sortBy]);

  const visibleTrails = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filtered = trails.filter((trail) => {
      const matchesSearch = !normalizedSearch ||
        trail.name.toLowerCase().includes(normalizedSearch) ||
        trail.description.toLowerCase().includes(normalizedSearch) ||
        trail.tags.some((tag) => tag.toLowerCase().includes(normalizedSearch));
      const matchesDifficulty = !selectedDifficulty || trail.difficulty === selectedDifficulty;
      const matchesRoute = !selectedRouteType || trail.routeType === selectedRouteType;

      return matchesSearch && matchesDifficulty && matchesRoute;
    });

    return sortTrails(filtered);
  }, [searchTerm, selectedDifficulty, selectedRouteType, sortTrails, trails]);

  const latestTrails = useMemo(() => sortTrails(trails).slice(0, 6), [sortTrails, trails]);

  const fetchTrails = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const trimmedSearch = searchTerm.trim();
      const result = trimmedSearch
        ? await alltracks.searchTrails(trimmedSearch, 0n, PAGE_SIZE)
        : selectedDifficulty
          ? await alltracks.getTrails({ difficulty: difficultyMap[selectedDifficulty] }, 0n, PAGE_SIZE)
          : selectedRouteType
            ? await alltracks.getTrails({ ttype: routeTypeMap[selectedRouteType] }, 0n, PAGE_SIZE)
            : await alltracks.searchTrails('', 0n, PAGE_SIZE);

      setTrails(parseTrails(result));
    } catch (error) {
      console.error('Error loading trails:', error);
      setErrorMessage('Unable to load trails right now. Try refreshing the page.');
    } finally {
      setIsLoading(false);
    }
  }, [alltracks, searchTerm, selectedDifficulty, selectedRouteType]);

  useEffect(() => {
    const timeoutId = window.setTimeout(fetchTrails, 250);
    return () => window.clearTimeout(timeoutId);
  }, [fetchTrails]);

  const fetchTrailsInView = async (bounds) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await alltracks.getTrailsInBounds({
        north: bounds._northEast.lat,
        south: bounds._southWest.lat,
        east: bounds._northEast.lng,
        west: bounds._southWest.lng
      });

      setTrails(parseTrails(result));
    } catch (error) {
      console.error('Error loading trails in view:', error);
      setErrorMessage('Unable to load trails in this map area.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMapMove = () => {
    if (mapRef.current && !searchTerm.trim()) {
      fetchTrailsInView(mapRef.current.getBounds());
    }
  };

  const MapEvents = () => {
    const map = useMap();

    useEffect(() => {
      if (map) {
        map.on('moveend', handleMapMove);
      }
      return () => {
        map.off('moveend', handleMapMove);
      };
    }, [map]);

    return null;
  };

  const handleTrailToggle = async (trail: Trail) => {
    if (selectedTrailId === Number(trail.id)) {
      setSelectedTrailId(null);
      setTrailPath([]);
    } else {
      const trackpoints = await parseTrailFile(trail.trailfile.url, trail.trailfile.fileType);
      setSelectedTrailId(Number(trail.id));
      setTrailPath(trackpoints);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedDifficulty('');
    setSelectedRouteType('');
    setSortBy('latest');
  };

  return (
    <div className="trails-container">
      <header className="trails-header">
        <div>
          <p className="trails-eyebrow">Trail finder</p>
          <h1>Hiking Trails</h1>
          <p>Search the trail catalog, narrow by difficulty or route type, and discover the newest routes added by the community.</p>
        </div>
      </header>

      <section className="trails-toolbar" aria-label="Trail search and filters">
        <label className="trail-search-field">
          <span className="material-icons">search</span>
          <input
            type="search"
            placeholder="Search by name, description, or tag"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </label>
        <select value={selectedDifficulty} onChange={(e) => setSelectedDifficulty(e.target.value as DifficultyFilter)}>
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="moderate">Moderate</option>
          <option value="hard">Hard</option>
          <option value="expert">Expert</option>
        </select>
        <select value={selectedRouteType} onChange={(e) => setSelectedRouteType(e.target.value as RouteFilter)}>
          <option value="">All route types</option>
          <option value="loop">Loop</option>
          <option value="out-and-back">Out and back</option>
          <option value="point-to-point">Point to point</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}>
          <option value="latest">Latest added</option>
          <option value="rating">Highest rated</option>
          <option value="distance">Shortest distance</option>
        </select>
        <button type="button" onClick={resetFilters}>Reset</button>
      </section>

      {errorMessage && <div className="trails-alert">{errorMessage}</div>}

      <section className="trails-content-grid">
        <div className="trails-map-card">
          <div className="trails-section-heading">
            <div>
              <h2>Explore on the map</h2>
              <span>{visibleTrails.length} trail{visibleTrails.length === 1 ? '' : 's'} matching your filters</span>
            </div>
            {isLoading && <span className="trails-loading"><span className="material-icons spinning">refresh</span> Loading</span>}
          </div>
          <MapContainer center={defaultCenter} zoom={13} className="trails-map" ref={mapRef}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            <MapEvents />
            {visibleTrails.map(trail => (
              trail.startPoint && (
                <Marker key={trail.id} position={[trail.startPoint.latitude, trail.startPoint.longitude]} icon={customIcon}>
                  <Popup>
                    <div className="trail-popup">
                      <h3>{trail.name}</h3>
                      <div className="trail-stats">
                        <span>{trail.distance} km</span>
                        <span>{trail.duration} hours</span>
                        <span>{trail.elevationGain} m</span>
                      </div>
                      <div className="trail-actions">
                        <Link to={`/trail/${trail.id}`} className="icon-button trail-detail-link" title="Open trail details" aria-label={`Open details for ${trail.name}`}>
                          <span className="material-icons">open_in_new</span>
                        </Link>
                        <button className={`icon-button ${selectedTrailId === Number(trail.id) ? 'active' : ''}`} onClick={() => handleTrailToggle(trail)} title="Show route on map" aria-label={`Show route for ${trail.name}`}>
                          <span className="material-icons">route</span>
                        </button>
                        <a href={trail.trailfile.url} download className="icon-button" title="Download trail file" aria-label={`Download ${trail.name} trail file`}>
                          <span className="material-icons">download</span>
                        </a>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}
            {selectedTrailId && trailPath && <Polyline positions={trailPath} color="#ff4400" weight={3} />}
          </MapContainer>
        </div>

        <aside className="latest-trails-card">
          <div className="trails-section-heading">
            <div>
              <h2>Latest added trails</h2>
              <span>Fresh routes from the community</span>
            </div>
          </div>
          <div className="latest-trails-list">
            {latestTrails.length > 0 ? latestTrails.map((trail) => (
              <Link to={`/trail/${trail.id}`} className="latest-trail-item" key={trail.id}>
                <img src={trail.photos[0] || DEFAULT_TRAIL_IMAGE} alt="" />
                <div>
                  <strong>{trail.name}</strong>
                  <span>{trail.distance} km · {trail.difficulty} · {trail.rating}/5</span>
                </div>
              </Link>
            )) : <p className="trails-empty">No trails have been added yet.</p>}
          </div>
        </aside>
      </section>

      <section className="trail-results-section">
        <div className="trails-section-heading">
          <div>
            <h2>Trail list</h2>
            <span>Sorted by {sortBy === 'latest' ? 'latest added' : sortBy === 'rating' ? 'highest rated' : 'shortest distance'}</span>
          </div>
        </div>
        <div className="trails-grid">
          {visibleTrails.length > 0 ? visibleTrails.map((trail) => (
            <article className="trail-card" key={trail.id}>
              <div className="trail-image">
                <img src={trail.photos[0] || DEFAULT_TRAIL_IMAGE} alt={trail.name} />
                <span className={`difficulty-badge ${trail.difficulty}`}>{trail.difficulty}</span>
              </div>
              <div className="trail-info">
                <h3>{trail.name}</h3>
                <p>{trail.description}</p>
                <div className="trail-stats">
                  <span>{trail.distance} km</span>
                  <span>{trail.duration} hrs</span>
                  <span>{trail.elevationGain} m gain</span>
                </div>
                <div className="trail-tags">
                  {trail.tags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
                </div>
                <div className="trail-actions">
                  <Link to={`/trail/${trail.id}`} className="trail-card-link">View details</Link>
                  <button className="show-trail-btn" onClick={() => handleTrailToggle(trail)}>
                    <span className="material-icons">route</span>
                    {selectedTrailId === Number(trail.id) ? 'Hide route' : 'Show route'}
                  </button>
                </div>
              </div>
            </article>
          )) : (
            <div className="trails-empty">
              <span className="material-icons">hiking</span>
              <p>No trails match your filters.</p>
              <button type="button" onClick={resetFilters}>Clear filters</button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
