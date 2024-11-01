import React, { useState, useEffect } from 'react';
import { saveAs } from 'file-saver';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import { icon } from 'leaflet';

// Fix for default marker icon
const defaultIcon = icon({
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

interface TrackPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  elevation?: number;
}

function App() {
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number]>([49.2827, -123.1207]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => console.log('Location error:', error),
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    }
  }, []);

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
  const getDuration = (): string => {
    if (trackPoints.length < 2) return '0:00';
    const startTime = trackPoints[0].timestamp;
    const endTime = trackPoints[trackPoints.length - 1].timestamp;
    const durationMs = endTime - startTime;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  const getMapCenter = () => {
    if (trackPoints.length === 0) {
      return [49.2827, -123.1207];
    }
    const lastPoint = trackPoints[trackPoints.length - 1];
    return [lastPoint.latitude, lastPoint.longitude];
  };

  const getPolylinePoints = () => {
    return trackPoints.map(point => [point.latitude, point.longitude]);
  };

  const recordPoint = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPoint: TrackPoint = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: position.timestamp,
            elevation: position.coords.altitude || undefined,
          };
          setTrackPoints((prev) => [...prev, newPoint]);
        },
        (error) => console.error('Error getting location:', error),
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    }
  };

  const exportToCsv = () => {
    const header = 'timestamp,latitude,longitude,elevation\n';
    const csvContent = trackPoints.map(point =>
      `${point.timestamp},${point.latitude},${point.longitude},${point.elevation || ''}`
    ).join('\n');

    const csvData = header + csvContent;
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `hiking-track-${new Date().toISOString()}.csv`);
  };

  const clearPoints = () => {
    setTrackPoints([]);
  };
  return (
    <div className="App">
      <header className="App-header">
        <h1>HikingTrack</h1>
        <div className="controls">
          <button onClick={recordPoint}>Record Point ({trackPoints.length})</button>
        </div>
        {trackPoints.length > 0 &&
          <div className="stats">

            <p>Start time: {new Date(trackPoints[0].timestamp).toLocaleString()}</p>
            <p>Duration: {getDuration()} hours</p>
            <p>Distance: {getTotalDistance()} km</p>
            <div className="last-point">
              <h3>Last recorded point:</h3>
              <p>Latitude: {trackPoints[trackPoints.length - 1].latitude}</p>
              <p>Longitude: {trackPoints[trackPoints.length - 1].longitude}</p>
              <p>Time: {new Date(trackPoints[trackPoints.length - 1].timestamp).toLocaleTimeString()}</p>
            </div>


          </div>}
        <div className="map-container">
          <MapContainer
            center={getMapCenter() as [number, number]}
            zoom={9}
            style={{ height: '400px', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {trackPoints.map((point, index) => (
              <Marker
                key={point.timestamp}
                position={[point.latitude, point.longitude]}
                icon={defaultIcon}
              />
            ))}
            <Polyline
              positions={getPolylinePoints() as [number, number][]}
              color="blue"
            />
          </MapContainer>
        </div>



        <div className="bottom-controls">
          <button onClick={exportToCsv} disabled={trackPoints.length === 0}>
            Export to CSV
          </button>
          <button onClick={clearPoints} disabled={trackPoints.length === 0}>
            Clear All
          </button>
        </div>
      </header>
    </div>
  );
}

export default App;
