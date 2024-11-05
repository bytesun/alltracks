import React, { useState, useEffect } from 'react';
import { saveAs } from 'file-saver';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { v4 as uuidv4 } from 'uuid';

import './App.css';
import { icon } from 'leaflet';
import { useMap } from 'react-leaflet';
import { CommentModal } from './components/CommentModal';

import { TrackPoint, generateGPX, generateKML } from "./utils/exportFormats";

import { parseCSV, parseGPX, parseKML } from "./utils/importFormats";
import { ExportModal } from './components/ExportModal';

import { signIn, signOut, authSubscribe, User, uploadFile, setDoc } from "@junobuild/core";
import { Navbar } from './components/Navbar';
import { TrackPointsModal } from './components/TrackPointsModal';
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
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [trackId] = useState(() => uuidv4());

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
    if (trackPoints.length < 2) return "00.00";
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
  const getElevationGain = () => {
    let elevationGain = 0;
    for (let i = 1; i < trackPoints.length; i++) {
      const elevationDiff = (trackPoints?.[i].elevation ?? 0) - (trackPoints?.[i - 1].elevation ?? 0);
      if (elevationDiff > 0) {
        elevationGain += elevationDiff;
      }
    }
    return elevationGain;
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

  const shareTrack = () => {
    const shareUrl = `${window.location.origin}/track/${trackId}`;
    navigator.clipboard.writeText(shareUrl);
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


  const handleExport = async (format: string, storage: 'local' | 'cloud', filename: string, description: string) => {
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

    const expfilename = `${filename}.${format}`;

    if (storage === 'local') {
      const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
      saveAs(blob, expfilename);
    } else {
      const blob = new Blob([content], { type: mimeType });
      const file = new File([blob], expfilename, { type: mimeType });
      const savedAsset = await uploadFile({
        data: file,
        collection: "tracks"
      });
      console.log(savedAsset);
      if (savedAsset) {
        // Get the uploaded file reference
        const fileRef = savedAsset.downloadUrl;

        // Calculate distance and elevation gain
        const distance = getTotalDistance();
        const elevationGain = getElevationGain();
        const duration = getDuration();
        const docResult = await setDoc({
          collection: "tracks",
          doc: {
            key: uuidv4(),
            data: {
              filename: filename,
              description: description,
              startime: new Date(trackPoints[0].timestamp).toLocaleString(),
              endtime: new Date(trackPoints[trackPoints.length - 1].timestamp).toLocaleString(),
              trackfile: fileRef,
              distance: distance,
              duration: duration,
              elevationGain: elevationGain
            }
          }
        });
        console.log(docResult);
      }
    }
  };

  return (
    <div className="App">
      <Navbar user={user} onAuth={handleAuth} />
      <header className="App-header">

        {locationError && (
          <div className="location-error">
            {locationError}
          </div>
        )}
        {(!trackPoints || trackPoints.length == 0) && (
          <div className="recording-mode">
            <label>
              <input
                type="radio"
                value="manual"
                checked={recordingMode === 'manual'}
                onChange={(e) => setRecordingMode('manual')}
              />
              Manual
            </label>
            <label>
              <input
                type="radio"
                value="auto"
                checked={recordingMode === 'auto'}
                onChange={(e) => setRecordingMode('auto')}
              />
              Automatic
            </label>
          </div>)}

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
            <p>Elevation Gain: {getElevationGain().toFixed(1)} m</p>
            <p
              onClick={() => setShowPointsModal(true)}
              className="points-count-link"
            >
              Recorded Points: <span className="clickable-count">{trackPoints.length}</span>
            </p>
           


          </div>}
        
        {viewMode === 'map' ? (
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
        ) : (
          <div className="list-container">
            <table className="points-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Elevation</th>
                  <th>Comment</th>
                </tr>
              </thead>
              <tbody>
                {trackPoints.map((point, index) => (
                  <tr key={point.timestamp}>
                    <td>{new Date(point.timestamp).toLocaleTimeString()}</td>
                    <td>{point.latitude.toFixed(6)}</td>
                    <td>{point.longitude.toFixed(6)}</td>
                    <td>{point.elevation?.toFixed(1) || '-'}</td>
                    <td>{point.comment || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
          <button onClick={() => setShowExportModal(true)} disabled={trackPoints.length == 0}>
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
      {showPointsModal && (
        <TrackPointsModal
          points={trackPoints}
          onClose={() => setShowPointsModal(false)}
        />
      )}

    </div>
  );
}

export default MainApp;
