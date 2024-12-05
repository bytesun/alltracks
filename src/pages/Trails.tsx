import React, { useState, useEffect, useRef } from 'react';

import { Spinner } from '../components/Spinner';
import './Trails.css';
import { Trail } from '../types/Trail'

import { useAlltracks } from '../components/Store';
import { parseTrails } from '../utils/trailUtils';

import { Map as LeafletMap } from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LatLngTuple } from 'leaflet';
import { Icon } from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

export const Trails = () => {
  const alltracks = useAlltracks();
  const [trails, setTrails] = useState<Trail[]>([]);

  const DEFAULT_TRAIL_IMAGE = '/alltracks_hero.png';
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [mapBounds, setMapBounds] = useState(null);
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
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setDefaultCenter([latitude, longitude] as LatLngTuple);
      });
    }
  }, []);
  // Filter trails based on selected difficulty
  const filteredTrails = selectedDifficulty
    ? trails.filter(trail => trail.difficulty === selectedDifficulty)
    : trails;

  // useEffect(() => {
  //   fetchTrails();
  // }, [selectedDifficulty]);

  const fetchTrails = async () => {
    setIsLoading(true);

    const result = await alltracks.getTrails({ "ttype": { "tloop": null } });
    const formattedTrails = parseTrails(result);
    setTrails(formattedTrails);
    setIsLoading(false);
  };

  const fetchTrailsInView = async (bounds) => {
    setIsLoading(true);
    const result = await alltracks.getTrailsInBounds({
      north: bounds._northEast.lat,
      south: bounds._southWest.lat,
      east: bounds._northEast.lng,
      west: bounds._southWest.lng
    });

    const formattedTrails = parseTrails(result);
    console.log(formattedTrails)
    setTrails(formattedTrails);
    setIsLoading(false);
  };

  const handleMapMove = () => {
    if (mapRef.current) {
      const bounds = mapRef.current.getBounds();
      setMapBounds(bounds);
      fetchTrailsInView(bounds);
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
  const parseTrailFile = async (url: string, fileType: string) => {
    const response = await fetch(url);
    const data = await response.text();
    const parser = new DOMParser();
    let trackpoints: LatLngTuple[] = [];

    switch (fileType) {
      case 'application/gpx+xml':
        const gpx = parser.parseFromString(data, "text/xml");
        trackpoints = Array.from(gpx.querySelectorAll('trkpt')).map(point => [
          Number(point.getAttribute('lat')),
          Number(point.getAttribute('lon'))
        ] as LatLngTuple);
        break;

      case 'application/json':
        const json = JSON.parse(data);
        trackpoints = json.features[0].geometry.coordinates.map(([lon, lat]) =>
          [lat, lon] as LatLngTuple
        );
        break;

      case 'application/vnd.google-earth.kml+xml':
        const kml = parser.parseFromString(data, "text/xml");
        trackpoints = kml.querySelector('coordinates')?.textContent
          ?.trim()
          .split(' ')
          .map(coord => {
            const [lon, lat] = coord.split(',');
            return [Number(lat), Number(lon)] as LatLngTuple;
          }) || [];
        break;

      case 'text/csv':
        const rows = data.split('\n').slice(1);
        trackpoints = rows.map(row => {
          const [lat, lon] = row.split(',');
          return [Number(lat), Number(lon)] as LatLngTuple;
        });
        break;
    }

    return trackpoints;
  };


  const handleTrailToggle = async (trail) => {
    if (Number(selectedTrailId) === Number(trail.id)) {
      setSelectedTrailId(null);
      setTrailPath([]);
    } else {
      const trackpoints = await parseTrailFile(trail.trailfile.url, trail.trailfile.fileType);
      setSelectedTrailId(trail.id);
      setTrailPath(trackpoints);
    }
  };

  return (
    <div className="trails-container">

      <header className="trails-header">
        <h1>Hiking Trails</h1>
        <div className="trails-filters">
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="moderate">Moderate</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </header>

      <MapContainer
        center={defaultCenter}
        zoom={13}
        className="trails-map"
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <MapEvents />
        {filteredTrails.map(trail => (
          trail.startPoint && (
            <Marker
              key={trail.id}
              position={[trail.startPoint.latitude, trail.startPoint.longitude]}
              icon={customIcon}>

              <Popup>
                <div className="trail-popup">
                  <h3>{trail.name}</h3>
                  <div className="trail-stats">
                    <span>{trail.distance} km</span>
                    <span>{trail.duration} hours</span>
                    <span>{trail.elevationGain} m</span>
                  </div>
                  <div className="trail-actions">
                    <button
                      className={`icon-button ${selectedTrailId === trail.id ? 'active' : ''}`}
                      onClick={() => handleTrailToggle(trail)}
                    >
                      <span className="material-icons">route</span>
                    </button>
                    <a
                      href={trail.trailfile.url}
                      download
                      className="icon-button"
                    >
                      <span className="material-icons">download</span>
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        ))}
        {selectedTrailId && trailPath && (
          <Polyline
            positions={trailPath}
            color="#ff4400"
            weight={3}
          />
        )}
      </MapContainer>

    </div>
  );
};

