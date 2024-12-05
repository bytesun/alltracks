import React, { useState, useEffect, useRef } from 'react';

import { Spinner } from '../components/Spinner';
import './Trails.css';
import { Trail } from '../types/Trail'

import { useAlltracks } from '../components/Store';
import { parseTrails } from '../utils/trailUtils';

import { Map as LeafletMap } from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LatLngTuple } from 'leaflet';

export const Trails = () => {
  const alltracks = useAlltracks();
  const [trails, setTrails] = useState<Trail[]>([]);

  const DEFAULT_TRAIL_IMAGE = '/alltracks_hero.png';
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [mapBounds, setMapBounds] = useState(null);
  const mapRef = useRef<LeafletMap>(null);

  const [defaultCenter, setDefaultCenter] = useState<LatLngTuple>([49.2827,  -123.1207]);
  
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
    console.log(result)
    const formattedTrails = parseTrails(result);
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
            >
              <Popup>
                <div className="trail-popup">
                  <h3>{trail.name}</h3>
                  <div className="trail-stats">
                    <span>{trail.distance} km</span>
                    <span>{trail.duration} hours</span>
                    <span>{trail.elevationGain} m</span>
                  </div>
                  <div className="trail-difficulty">
                    {trail.difficulty}
                  </div>
                  <a href={trail.trailfile.url} className="download-link">
                    Download GPX
                  </a>
                </div>
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>

    </div>
  );
};