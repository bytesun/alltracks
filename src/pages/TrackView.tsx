import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import { TrackPoint } from '../utils/exportFormats';
import { Navbar } from '../components/Navbar';
import { icon } from 'leaflet';

const defaultIcon = icon({
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export const TrackView = () => {
  const { trackId } = useParams();
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [showPoints, setShowPoints] = useState(true);

  const getPolylinePoints = () => {
    return trackPoints.map(point => [point.latitude, point.longitude]);
  };

  const getMapCenter = () => {
    if (trackPoints.length > 0) {
      const lastPoint = trackPoints[trackPoints.length - 1];
      return [lastPoint.latitude, lastPoint.longitude];
    }
    return [49.2827, -123.1207];
  };
  const getDuration = (): string => {
    if (trackPoints.length < 2) return '0:00';
    const startTime = trackPoints[0].timestamp;
    const endTime = trackPoints[trackPoints.length - 1].timestamp;
    const durationMs = endTime - startTime;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  
  const getTotalDistance = (): string => {
    if (trackPoints.length < 2) return '0.00';
    let total = 0;
    for (let i = 1; i < trackPoints.length; i++) {
      total += calculateDistance(
        trackPoints[i - 1].latitude,
        trackPoints[i - 1].longitude,
        trackPoints[i].latitude,
        trackPoints[i].longitude
      );
    }
    return total.toFixed(2);
  };
  
  return (
    <div>
      <Navbar user={null} onAuth={async () => {}} />
      <div className="track-view">
        <div className="stats">
          {trackPoints.length > 0 && (
            <>
              <p>Start time: {new Date(trackPoints[0].timestamp).toLocaleString()}</p>
              <p>Duration: {getDuration()} hours</p>
              <p>Distance: {getTotalDistance()} km</p>
              <p>Recorded Points: {trackPoints.length}</p>
            </>
          )}
        </div>
        
        <div className="map-container">
          <MapContainer
            center={getMapCenter() as [number, number]}
            zoom={13}
            style={{ height: '400px', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              attribution=''
              maxZoom={17}
            />
            {showPoints && trackPoints.map((point) => (
              <Marker
                key={point.timestamp}
                position={[point.latitude, point.longitude]}
                icon={defaultIcon}
              />
            ))}
            <Polyline
              positions={getPolylinePoints() as [number, number][]}
              color="red"
            />
          </MapContainer>
        </div>

        <div className="map-controls">
          <label>
            <input
              type="checkbox"
              checked={showPoints}
              onChange={(e) => setShowPoints(e.target.checked)}
            />
            Show Points
          </label>
        </div>
      </div>
    </div>
  );
};

