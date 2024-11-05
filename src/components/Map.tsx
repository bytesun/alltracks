import React,{ useState } from 'react';
import { TrackPoint } from '../utils/exportFormats';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useMap } from 'react-leaflet';
import { icon } from 'leaflet';

interface MapProps {
  trackPoints: TrackPoint[];
  isTracking: boolean;
  onAddPoint: (point: TrackPoint) => void;
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

export const Map: React.FC<MapProps> = ({ trackPoints, isTracking, onAddPoint }) => {
  const [autoCenter, setAutoCenter] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number]>([49.2827, -123.1207]);
const defaultIcon = icon({
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
  const getMapCenter = () => {
    if (isTracking) {
      return userLocation;
    }
    if (trackPoints.length > 0) {
      const lastPoint = trackPoints[trackPoints.length - 1];
      return [lastPoint.latitude, lastPoint.longitude];
    }
    return userLocation;
  };
  function RecenterMap({ position }: { position: [number, number] }) {
    const map = useMap();
    map.setView(position);
    return null;
  }
  const getPolylinePoints = () => {
    return trackPoints.map(point => [point.latitude, point.longitude]);
  };
  return (
    <div className="map-container">
            <MapContainer
              center={getMapCenter() as [number, number]}
              zoom={9}
              style={{ height: '400px', width: '100%' }}
            >
              {autoCenter && <RecenterMap position={userLocation} />}
              <TileLayer
                url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                attribution=''
                maxZoom={17}
              />
              <div className="leaflet-top leaflet-left custom-controls">
                <div className="leaflet-control leaflet-bar">
                  <a
                    href="#"
                    className={`leaflet-control-button ${autoCenter ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault()
                      setAutoCenter(!autoCenter)
                    }}
                    title="Auto Center"
                  >
                    <span className="material-icons">my_location</span>
                  </a>
                  <a
                    href="#"
                    className={`leaflet-control-button ${showPoints ? 'active' : ''}`}
                    onClick={(e) => {
                      e.preventDefault()
                      setShowPoints(!showPoints)
                    }}
                    title="Show Points"
                  >
                    <span className="material-icons">place</span>
                  </a>
                </div>
              </div>
              {/* Rest of map components */}
              {showPoints && trackPoints.map((point, index) => (
                <Marker
                  key={point.timestamp}
                  position={[point.latitude, point.longitude]}
                  icon={defaultIcon}
                />
              ))}
              {userLocation && <Marker
                position={userLocation}
                icon={currentLocationIcon}
              />}

              <Polyline
                positions={getPolylinePoints() as [number, number][]}
                color="red"
              />
            </MapContainer>

          </div>
  );
};