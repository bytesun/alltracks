import React from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import { TrackPoint } from '../utils/exportFormats';
import { icon } from 'leaflet';

interface TrackMapProps {
  trackPoints: TrackPoint[];
  userLocation: [number, number];
  autoCenter: boolean;
  showPoints: boolean;
  onToggleAutoCenter: () => void;
  onToggleShowPoints: () => void;
}

const defaultIcon = icon({
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const currentLocationIcon = icon({
  iconUrl: '/currentlocation.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export const TrackMap: React.FC<TrackMapProps> = ({
  trackPoints,
  userLocation,
  autoCenter,
  showPoints,
  onToggleAutoCenter,
  onToggleShowPoints,
}) => {
  const getMapCenter = () => {
    if (trackPoints.length > 0) {
      const lastPoint = trackPoints[trackPoints.length - 1];
      return [lastPoint.latitude, lastPoint.longitude];
    }
    return userLocation;
  };

  return (
    <div className="map-container">
      <MapContainer
        center={getMapCenter() as [number, number]}
        zoom={9}
        style={{ height: '400px', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          attribution=""
          maxZoom={17}
        />
        <div className="leaflet-top leaflet-left custom-controls">
          <div className="leaflet-control leaflet-bar">
            <a
              href="#"
              className={`leaflet-control-button ${autoCenter ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                onToggleAutoCenter();
              }}
              title="Auto Center"
            >
              <span className="material-icons">my_location</span>
            </a>
            <a
              href="#"
              className={`leaflet-control-button ${showPoints ? 'active' : ''}`}
              onClick={(e) => {
                e.preventDefault();
                onToggleShowPoints();
              }}
              title="Show Points"
            >
              <span className="material-icons">place</span>
            </a>
          </div>
        </div>

        {showPoints && trackPoints.map((point) => (
          <Marker
            key={point.timestamp}
            position={[point.latitude, point.longitude]}
            icon={defaultIcon}
          />
        ))}
        
        <Marker position={userLocation} icon={currentLocationIcon} />
        
        <Polyline
          positions={trackPoints.map(point => [point.latitude, point.longitude])}
          color="red"
        />
      </MapContainer>
    </div>
  );
};
