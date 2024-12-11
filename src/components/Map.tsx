import React,{ useState, useEffect } from 'react';
import { TrackPoint } from '../types/TrackPoint';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';

import L from 'leaflet';

import 'leaflet/dist/leaflet.css';
import { useMap } from 'react-leaflet';
import { icon } from 'leaflet';

interface MapProps {
  trackPoints: TrackPoint[];
  isTracking: boolean;
  onAddPoint: () => void;
  currentPoint?: TrackPoint;  // Add this
  isPlayback?: boolean;       // Add this
}

const defaultIcon = icon({
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const currentLocationIcon = icon({
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export const Map: React.FC<MapProps> = ({ trackPoints, isTracking, onAddPoint, currentPoint, isPlayback }) => {
  const [autoCenter, setAutoCenter] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number]>([49.2827, -123.1207]);

  const getMapCenter = () => {
    if (trackPoints.length > 0) {
      const firstPoint = trackPoints[0];
      return [firstPoint.latitude, firstPoint.longitude];
    }
    if (isTracking) {
      return userLocation;
    }
    return userLocation;
  };

  function RecenterMap({ position }: { position: [number, number] }) {
    const map = useMap();
    map.setView(position);
    return null;
  }

  function PlaybackController() {
    const map = useMap();
    
    useEffect(() => {
      if (isPlayback && currentPoint) {
        map.setView([currentPoint.latitude, currentPoint.longitude], 13);
      }
    }, [currentPoint, isPlayback]);
    
    return null;
  }

  const getPolylinePoints = () => {
    return trackPoints.map(point => [point.latitude, point.longitude]);
  };

  function MapClickHandler() {
    const map = useMap();
    
    useEffect(() => {
      map.on('click', async (e) => {

        console.log('Map clicked!');
        // const response = await fetch(`https://api.opentopodata.org/v1/srtm30m?locations=${e.latlng.lat},${e.latlng.lng}`);
        // const data = await response.json();
        // const elevation = data.results[0].elevation;
        
        L.popup()
          .setLatLng(e.latlng)
          .setContent(`
            Lat: ${e.latlng.lat.toFixed(6)}<br>
            Lon: ${e.latlng.lng.toFixed(6)}<br>
            
          `)
          .openOn(map);
      });
    }, [map]);
    
    return null;
  }
  
  return (
    <div className="map-container">
      <MapContainer
        center={currentPoint ? [currentPoint.latitude, currentPoint.longitude] : getMapCenter() as [number, number]}
        zoom={13}
        style={{ height: '650px', width: '100%' }}
      >
        <MapClickHandler />
        <TileLayer
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          attribution=''
          maxZoom={20}
        />
        <RecenterMap position={currentPoint ? [currentPoint.latitude, currentPoint.longitude] : getMapCenter() as [number, number]} />
        <PlaybackController />
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
        {showPoints && trackPoints.map((point, index) => (
          <Marker
            key={point.timestamp}
            position={[point.latitude, point.longitude]}
            icon={defaultIcon}
          />
        ))}
        {currentPoint && isPlayback && (
          <Marker
            position={[currentPoint.latitude, currentPoint.longitude]}
            icon={currentLocationIcon}
          />
        )}

        <Polyline
          positions={getPolylinePoints() as [number, number][]}
          color="red"
        />
      </MapContainer>
    </div>
  );
};
