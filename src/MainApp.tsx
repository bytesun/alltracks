import React, { useState, useEffect } from 'react';
import { saveAs } from 'file-saver';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import './App.css';
import { icon } from 'leaflet';
import { useMap } from 'react-leaflet';
import { CommentModal } from './components/CommentModal';
import { DropdownMenu } from './components/DropdownMenu';

import { TrackPoint, generateGPX, generateKML } from "./utils/exportFormats";

import { parseCSV, parseGPX, parseKML } from "./utils/importFormats";
import { ExportModal } from './components/ExportModal';

import { signIn, signOut, authSubscribe, User, uploadFile } from "@junobuild/core";

// Fix for default marker icon
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


function MainApp() {
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number]>([49.2827, -123.1207]);
  const [recordingMode, setRecordingMode] = useState<'manual' | 'auto'>('manual');
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timer | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState<'idle' | 'tracking' | 'paused'>('idle');
  const [autoRecordingSettings, setAutoRecordingSettings] = useState({
    minDistance: 10, // meters
    minTime: 10, // seconds
    lastRecordedPosition: null as TrackPoint | null
  });
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<GeolocationPosition | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [autoCenter, setAutoCenter] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = authSubscribe((user: User | null) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async (): Promise<void> => {
    console.log("signing in ", user)
    if (user) {
      await signOut();
    } else {

      await signIn();
    }
  };
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
          setLocationError(''); // Clear any previous errors
        },
        (error) => {
          let errorMessage = 'Unable to get your location. ';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'Please enable location permissions.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location information unavailable.';
              break;
            case error.TIMEOUT:
              errorMessage += 'Location request timed out.';
              break;
          }
          setLocationError(errorMessage);
        },
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
  function RecenterMap({ position }: { position: [number, number] }) {
    const map = useMap();
    map.setView(position);
    return null;
  }
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

  const getPolylinePoints = () => {
    return trackPoints.map(point => [point.latitude, point.longitude]);
  };
  const startAutoRecording = () => {
    const interval = setInterval(recordPoint, 10000); // Records every 10 seconds
    setRecordingInterval(interval);
  };

  const stopAutoRecording = () => {
    if (recordingInterval) {
      clearInterval(recordingInterval);
      setRecordingInterval(null);
    }
  };
  const startTracking = () => {
    setTrackPoints([]);
    setIsTracking(true);
    setTrackingStatus('tracking');
    startAutoRecording();
  };

  const pauseTracking = () => {
    setIsTracking(false);
    setTrackingStatus('paused');
    stopAutoRecording();
  };

  const resumeTracking = () => {
    setIsTracking(true);
    setTrackingStatus('tracking');
    startAutoRecording();
  };

  const stopTracking = () => {
    setIsTracking(false);
    setTrackingStatus('idle');
    stopAutoRecording();
  };

  const shouldRecordNewPoint = (newPosition: GeolocationPosition): boolean => {
    if (!autoRecordingSettings.lastRecordedPosition) return true;

    const timeDiff = (newPosition.timestamp - autoRecordingSettings.lastRecordedPosition.timestamp) / 1000;
    if (timeDiff < autoRecordingSettings.minTime) return false;

    const distance = calculateDistance(
      autoRecordingSettings.lastRecordedPosition.latitude,
      autoRecordingSettings.lastRecordedPosition.longitude,
      newPosition.coords.latitude,
      newPosition.coords.longitude
    ) * 1000; // Convert km to meters

    return distance >= autoRecordingSettings.minDistance;
  };
  const recordPoint = () => {
    if (recordingMode === 'manual') {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setPendingPosition(position);
            setShowCommentModal(true);
          },
          (error) => console.error('Error getting location:', error),
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
          }
        );
      }
    } else {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (recordingMode === 'auto' && !shouldRecordNewPoint(position)) {
              return;
            }

            const newPoint: TrackPoint = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              timestamp: position.timestamp,
              elevation: position.coords.altitude || undefined,
              comment: '',
            };

            setTrackPoints((prev) => [...prev, newPoint]);
            setAutoRecordingSettings(prev => ({
              ...prev,
              lastRecordedPosition: newPoint
            }));
          },
          (error) => console.error('Error getting location:', error),
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
          }
        );
      }
    }
  };

  const savePointWithComment = (comment: string) => {
    if (pendingPosition) {
      const newPoint: TrackPoint = {
        latitude: pendingPosition.coords.latitude,
        longitude: pendingPosition.coords.longitude,
        timestamp: pendingPosition.timestamp,
        elevation: pendingPosition.coords.altitude || undefined,
        comment: comment.trim() || undefined,
      };
      setTrackPoints((prev) => [...prev, newPoint]);
      setPendingPosition(null);
    }
  };

  const exportTrack = (format: 'csv' | 'gpx' | 'kml') => {
    let content: string;
    let mimeType: string;
    let fileExtension: string;

    switch (format) {
      case 'gpx':
        content = generateGPX(trackPoints);
        mimeType = 'application/gpx+xml';
        fileExtension = 'gpx';
        break;
      case 'kml':
        content = generateKML(trackPoints);
        mimeType = 'application/vnd.google-earth.kml+xml';
        fileExtension = 'kml';
        break;
      default:
        const header = 'timestamp,latitude,longitude,elevation,comment\n';
        content = header + trackPoints.map(point =>
          `${point.timestamp},${point.latitude},${point.longitude},${point.elevation || ''},${point.comment || ''}`
        ).join('\n');
        mimeType = 'text/csv';
        fileExtension = 'csv';
    }

    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    saveAs(blob, `hiking-track-${new Date().toISOString()}.${fileExtension}`);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const content = await file.text();
    let points: TrackPoint[] = [];

    if (file.name.endsWith('.csv')) {
      points = parseCSV(content);
    } else if (file.name.endsWith('.gpx')) {
      points = parseGPX(content);
    } else if (file.name.endsWith('.kml')) {
      points = parseKML(content);
    }

    setTrackPoints(points);
  };

  const clearPoints = () => {
    setTrackPoints([]);
  };

  const [showExportModal, setShowExportModal] = useState(false);


  const handleExport = async (format: string, storage: 'local' | 'cloud') => {
    let content: string;
    let mimeType: string;

    switch (format) {
      case 'gpx':
        content = generateGPX(trackPoints);
        mimeType = 'application/gpx+xml';
        break;
      case 'kml':
        content = generateKML(trackPoints);
        mimeType = 'application/vnd.google-earth.kml+xml';
        break;
      default:
        const header = 'timestamp,latitude,longitude,elevation,comment\n';
        content = header + trackPoints.map(point =>
          `${point.timestamp},${point.latitude},${point.longitude},${point.elevation || ''},${point.comment || ''}`
        ).join('\n');
        mimeType = 'text/csv';
    }

    if (storage === 'local') {
      const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
      saveAs(blob, `hiking-track-${new Date().toISOString()}.${format}`);
    } else {
      const blob = new Blob([content], { type: mimeType });
      const file = new File([blob], `hiking-track-${new Date().toISOString()}.${format}`, { type: mimeType });
      const result = await uploadFile({
        data: file,
        collection: "tracks"
      });
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <DropdownMenu user={user} onAuth={handleAuth} />
        <h2>HikingTrack</h2>
        {locationError && (
          <div className="location-error">
            {locationError}
          </div>
        )}
        <div className="recording-mode">
          <label>
            <input
              type="radio"
              value="manual"
              checked={recordingMode === 'manual'}
              onChange={(e) => setRecordingMode('manual')}
              disabled={trackingStatus !== 'idle'}
            />
            Manual
          </label>
          <label>
            <input
              type="radio"
              value="auto"
              checked={recordingMode === 'auto'}
              onChange={(e) => setRecordingMode('auto')}
              disabled={trackingStatus !== 'idle'}
            />
            Auto
          </label>
        </div>

        {recordingMode === 'auto' && trackingStatus === 'idle' && (
          <div className="auto-settings">
            <label>
              Min Distance (m):
              <input
                type="number"
                value={autoRecordingSettings.minDistance}
                onChange={(e) => setAutoRecordingSettings(prev => ({
                  ...prev,
                  minDistance: Number(e.target.value)
                }))}
                min="1"
              />
            </label>
            <label>
              Min Time (s):
              <input
                type="number"
                value={autoRecordingSettings.minTime}
                onChange={(e) => setAutoRecordingSettings(prev => ({
                  ...prev,
                  minTime: Number(e.target.value)
                }))}
                min="1"
              />
            </label>
          </div>
        )}
        <div className="controls">
          {recordingMode === 'manual' ? (
            <button onClick={recordPoint}>
              Record Point
            </button>
          ) : (
            <div className="auto-controls">
              {trackingStatus === 'idle' && (
                <button onClick={startTracking}>Start</button>
              )}
              {trackingStatus === 'tracking' && (
                <button onClick={pauseTracking}>Pause </button>
              )}
              {trackingStatus === 'paused' && (
                <button onClick={resumeTracking}>Resume</button>
              )}
              {(trackingStatus === 'tracking' || trackingStatus === 'paused') && (
                <button onClick={stopTracking}>Stop</button>
              )}
            </div>
          )}
        </div>

        {trackPoints.length > 0 &&
          <div className="stats">

            <p>Start time: {new Date(trackPoints[0].timestamp).toLocaleString()}</p>
            <p>Duration: {getDuration()} hours</p>
            <p>Distance: {getTotalDistance()} km</p>
            <p>Recorded Points: {trackPoints.length}</p>
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
            {autoCenter && <RecenterMap position={userLocation} />}
            <TileLayer
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              attribution=''
              maxZoom={17}
            />
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
        <div className="map-controls">
          <label>
            <input
              type="checkbox"
              checked={autoCenter}
              onChange={(e) => setAutoCenter(e.target.checked)}
            />
            Auto Center
          </label>
          <label>
            <input
              type="checkbox"
              checked={showPoints}
              onChange={(e) => setShowPoints(e.target.checked)}
            />
            Show Points
          </label>
        </div>
        <div className="bottom-controls">
          <input
            type="file"
            accept=".csv,.gpx,.kml"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            id="file-upload"
          />
          <button onClick={() => document.getElementById('file-upload')?.click()}>
            Import
          </button>
          <button onClick={() => setShowExportModal(true)} disabled={trackPoints.length==0}>
            Export
          </button>

          <button onClick={clearPoints} disabled={trackPoints.length === 0}>
            Clear
          </button>
        </div>
      </header>

      {showCommentModal && (
        <CommentModal
          onSave={(comment) => {
            savePointWithComment(comment);
            setShowCommentModal(false);
          }}
          onClose={() => {
            setShowCommentModal(false);
            setPendingPosition(null);
          }}
        />
      )}

      {showExportModal && (
        <ExportModal
          onExport={handleExport}
          onClose={() => setShowExportModal(false)}
          user={user}
          onLogin={handleAuth}
        />
      )}

    </div>
  );
}

export default MainApp;
