import React, { useState, useEffect, useRef } from 'react';
import { saveAs } from 'file-saver';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

import './App.css';
import './styles/MainApp.css';

import { icon } from 'leaflet';
import { useMap } from 'react-leaflet';

import { generateGPX, generateKML } from "./utils/exportFormats";
import { TrackPoint } from './types/TrackPoint';
import { parseCSV, parseGPX, parseKML } from "./utils/importFormats";
import { StartTrackModal } from './components/StartTrackModal';
import { ExportModal } from './components/ExportModal';
import { CommentModal } from './components/CommentModal';
import { TrackPointsModal } from './components/TrackPointsModal';
import { FeedbackModal } from './components/FeedbackModal';
import { useNotification } from './context/NotificationContext';
import { setupIndexedDB, saveTrackPointsToIndexDB, getTrackPointsFromIndexDB, clearTrackFromIndexDB } from './utils/IndexDBHandler';
import Cookies from 'js-cookie';
import { ClearTracksModal } from './components/ClearTracksModal';
import { arweave, arweaveGateway } from './utils/arweave';
import { Trail } from './types/Trail';
import { TrailListModal } from './components/TrailListModal';
import { useAlltracks } from './components/Store';
import { useGlobalContext } from './components/Store';
import { FILETYPE_GPX, FILETYPE_KML } from './lib/constants';
import { TrackType } from './api/alltracks/backend.did';

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

function MainApp() {
  const { state: { isAuthed, principal, wallet } } = useGlobalContext();
  const alltracks = useAlltracks();
  const { showNotification } = useNotification();

  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [trackType, setTrackType] = useState<string>('hiking');
  const [trackName, setTrackName] = useState<string | null>(null);
  const [importPoints, setImportPoints] = useState<TrackPoint[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number]>([49.2827, -123.1207]);
  const [hasUserLocation, setHasUserLocation] = useState(false);
  const [recordingMode, setRecordingMode] = useState<'' | 'manual' | 'auto'>('manual');
  const [recordingInterval, setRecordingInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState<'idle' | 'tracking' | 'paused'>('idle');
  const [autoRecordingSettings, setAutoRecordingSettings] = useState({
    minDistance: 10,
    minTime: 10,
    lastRecordedPosition: null as TrackPoint | null
  });
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<GeolocationPosition | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [autoCenter, setAutoCenter] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
  const [viewMode] = useState<'map' | 'list'>('map');
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string>('0');
  const [initialCenterAfterImportDone, setInitialCenterAfterImportDone] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [hasCloudPoints, setHasCloudPoints] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showImportOptions, setShowImportOptions] = useState(false);
  const [message, setMessage] = useState<String | undefined>(undefined);
  const [showTrailList, setShowTrailList] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [shouldPlayHeroVideo, setShouldPlayHeroVideo] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowImportOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setupIndexedDB();
  }, []);

  useEffect(() => {
    const savedTrackId = Cookies.get('lastTrackId');
    const savedGroupId = Cookies.get('lastGroupId');
    if (savedTrackId) setTrackId(savedTrackId);
    if (savedGroupId) setGroupId(savedGroupId);
  }, []);

  useEffect(() => {
    const loadPoints = async () => {
      const result = await getTrackPointsFromIndexDB(trackId);
      if (result.points.length > 0) {
        setTrackPoints(result.points);
        setTrackType(result.trackType);
        const lastPoint = result.points[result.points.length - 1];
        setUserLocation([lastPoint.latitude, lastPoint.longitude]);
        setHasUserLocation(true);
        setAutoCenter(true);
        setTimeout(() => setAutoCenter(false), 500);
      }
      if (result.name) setTrackName(result.name);
      if (result.groupId) setGroupId(result.groupId);
    };

    if (trackId) loadPoints();
  }, [trackId]);

  useEffect(() => {
    const saveIndexdb = async () => {
      if (!trackId) return;
      await saveTrackPointsToIndexDB(trackId, trackPoints, trackType, trackName || undefined, groupId);
    };
    saveIndexdb();
  }, [trackPoints, trackType, trackName, groupId, trackId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileViewport = window.matchMedia('(max-width: 768px)');
    const updateVideoPreference = () => {
      setShouldPlayHeroVideo(!reducedMotion.matches && !mobileViewport.matches);
    };

    updateVideoPreference();
    reducedMotion.addEventListener?.('change', updateVideoPreference);
    mobileViewport.addEventListener?.('change', updateVideoPreference);

    return () => {
      reducedMotion.removeEventListener?.('change', updateVideoPreference);
      mobileViewport.removeEventListener?.('change', updateVideoPreference);
    };
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

  const getTotalDistance = (): number => {
    if (trackPoints.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < trackPoints.length; i++) {
      total += calculateDistance(
        trackPoints[i - 1].latitude,
        trackPoints[i - 1].longitude,
        trackPoints[i].latitude,
        trackPoints[i].longitude
      );
    }
    return total;
  };

  const getPaceDisplay = (): string => {
    if (trackPoints.length < 2) return '-';
    let total = 0;
    let totalTime = 0;
    for (let i = 1; i < trackPoints.length; i++) {
      const dist = calculateDistance(
        trackPoints[i - 1].latitude,
        trackPoints[i - 1].longitude,
        trackPoints[i].latitude,
        trackPoints[i].longitude
      );
      const timeSec = (trackPoints[i].timestamp - trackPoints[i - 1].timestamp) / 1000;
      if (dist > 0) {
        total += dist;
        totalTime += timeSec;
      }
    }
    const avgPace = total > 0 ? (totalTime / 60) / total : 0;
    if (!avgPace || avgPace === Infinity) return '-';
    const minP = Math.floor(avgPace);
    const secP = Math.round((avgPace - minP) * 60);
    return `${minP}:${secP.toString().padStart(2, '0')} min/km`;
  };

  const getElevationGain = (): number => {
    let elevationGain = 0;
    for (let i = 1; i < trackPoints.length; i++) {
      const elevationDiff = (trackPoints[i].elevation ?? 0) - (trackPoints[i - 1].elevation ?? 0);
      if (elevationDiff > 0) elevationGain += elevationDiff;
    }
    return elevationGain;
  };

  const getDuration = (): number => {
    if (trackPoints.length < 2) return 0;
    const startTime = trackPoints[0].timestamp;
    const endTime = trackPoints[trackPoints.length - 1].timestamp;
    return (endTime - startTime) / (1000 * 60 * 60);
  };

  const getMovingTime = (distanceThreshold = 5): number => {
    if (trackPoints.length < 2) return 0;
    let movingTimeMs = 0;
    for (let i = 1; i < trackPoints.length; i++) {
      const prev = trackPoints[i - 1];
      const curr = trackPoints[i];
      const dist = calculateDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude) * 1000;
      if (dist > distanceThreshold) movingTimeMs += curr.timestamp - prev.timestamp;
    }
    return movingTimeMs / (1000 * 60 * 60);
  };

  function RecenterMap({ position }: { position: [number, number] }) {
    const map = useMap();
    map.setView(position);
    return null;
  }

  const getMapCenter = () => {
    if (autoCenter && trackPoints.length > 0) {
      const lastPoint = trackPoints[trackPoints.length - 1];
      return [lastPoint.latitude, lastPoint.longitude];
    }
    if (isTracking && hasUserLocation) return userLocation;
    if (trackPoints.length > 0) {
      const lastPoint = trackPoints[trackPoints.length - 1];
      return [lastPoint.latitude, lastPoint.longitude];
    }
    return userLocation;
  };

  const getPolylinePoints = () => trackPoints.map(point => [point.latitude, point.longitude]);
  const getPolylineImportPoints = () => importPoints.map(point => [point.latitude, point.longitude]);

  const handleLocationError = (error: GeolocationPositionError) => {
    let errorMessage = 'Unable to get your location. ';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage += 'Enable location permission when you want to record a point.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage += 'Location information is unavailable.';
        break;
      case error.TIMEOUT:
        errorMessage += 'The GPS request timed out. Try again.';
        break;
      default:
        errorMessage += 'Try again.';
    }
    setLocationError(errorMessage);
    showNotification(errorMessage, 'error');
  };

  const rememberCurrentPosition = (position: GeolocationPosition) => {
    setUserLocation([position.coords.latitude, position.coords.longitude]);
    setHasUserLocation(true);
    setLocationError('');
  };

  const startAutoRecording = () => {
    const interval = setInterval(recordPoint, autoRecordingSettings.minTime * 1000);
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
    ) * 1000;

    return distance >= autoRecordingSettings.minDistance;
  };

  function RecenterOnImport() {
    const map = useMap();

    useEffect(() => {
      if (importPoints.length > 0 && !initialCenterAfterImportDone) {
        const firstPoint = importPoints[0];
        map.setView([firstPoint.latitude, firstPoint.longitude], 13);
        setInitialCenterAfterImportDone(true);
      }
    }, [importPoints, map]);

    return null;
  }

  const recordPoint = async () => {
    if (!navigator.geolocation) {
      const errorMessage = 'Geolocation is not supported by this browser.';
      setLocationError(errorMessage);
      showNotification(errorMessage, 'error');
      return;
    }

    if (recordingMode === 'manual') {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          rememberCurrentPosition(position);
          setPendingPosition(position);
          setShowCommentModal(true);
        },
        handleLocationError,
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        rememberCurrentPosition(position);
        if (recordingMode === 'auto' && !shouldRecordNewPoint(position)) return;

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
      handleLocationError,
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  };

  const savePointWithComment = async (data: {
    comment: string,
    category: string,
    cloudEnabled: boolean,
    isIncident: boolean,
    isPrivate: boolean,
    photo: File | undefined,
  }) => {
    let photoUrl: string | undefined;
    try {
      if (!pendingPosition) return;

      const latitude = pendingPosition.coords.latitude;
      const longitude = pendingPosition.coords.longitude;
      const elevation = pendingPosition.coords.altitude || undefined;
      const timestamp = pendingPosition.timestamp;

      const newPoint: TrackPoint = {
        latitude,
        longitude,
        timestamp,
        elevation: elevation || undefined,
        comment: data.comment.trim() || undefined,
        photo: photoUrl || undefined,
      };

      setTrackPoints((prev) => [...prev, newPoint]);
      const updatedPoints = [...trackPoints, newPoint];
      await saveTrackPointsToIndexDB(trackId, updatedPoints, trackType, trackName || undefined, groupId);

      if (data.photo) {
        if (wallet) {
          try {
            const photoBuffer = await data.photo.arrayBuffer();
            const transaction = await arweave.createTransaction({ data: photoBuffer }, wallet);
            transaction.addTag('Content-Type', data.photo.type);
            transaction.addTag('App-Name', 'AllTracks');
            transaction.addTag('Track-ID', trackId || '');
            transaction.addTag('Group-ID', groupId);
            transaction.addTag('Note', data.comment);

            await arweave.transactions.sign(transaction, wallet);
            const response = await arweave.transactions.post(transaction);

            if (response.status === 200) {
              photoUrl = `${arweaveGateway}/${transaction.id}`;
              setTrackPoints(prev => prev.map(point =>
                point.timestamp === pendingPosition.timestamp ? { ...point, photo: photoUrl } : point
              ));
              const pointsWithPhoto = updatedPoints.map(point =>
                point.timestamp === pendingPosition.timestamp ? { ...point, photo: photoUrl } : point
              );
              await saveTrackPointsToIndexDB(trackId, pointsWithPhoto, trackType, trackName || undefined, groupId);
              showNotification('Photo uploaded to Arweave', 'success');
            }
          } catch (error) {
            showNotification(`Error uploading photo: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
          }
        } else {
          const lat = pendingPosition.coords.latitude.toFixed(6);
          const long = pendingPosition.coords.longitude.toFixed(6);
          const photoFileName = `${lat}_${long}_${trackId}_${groupId}.jpg`;
          const photoFile = new File([data.photo], photoFileName, { type: data.photo.type });
          const localPhotoUrl = URL.createObjectURL(photoFile);
          const link = document.createElement('a');
          link.href = localPhotoUrl;
          link.download = photoFileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(localPhotoUrl);
        }
      }

      setPendingPosition(null);
      setAutoCenter(true);
      setTimeout(() => setAutoCenter(false), 100);

      if (data.cloudEnabled) {
        await alltracks.createCheckpoint({
          latitude,
          longitude,
          timestamp: BigInt(timestamp),
          elevation: elevation || undefined,
          note: data.comment?.trim() || '',
          photo: photoUrl ? [photoUrl] : [],
          isPublic: !data.isPrivate,
          groupId: groupId ? [groupId] : [],
          trackId
        });

        if (data.isIncident) {
          await alltracks.createIncidentPoint({
            latitude,
            longitude,
            timestamp: BigInt(timestamp),
            elevation: elevation || undefined,
            note: data.comment?.trim() || '',
            photo: photoUrl ? [photoUrl] : [],
            groupId: groupId ? [groupId] : [],
            trackId,
            severity: { "low": null },
            category: { "hazard": null }
          });
        }

        setHasCloudPoints(true);
      }
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      setMessage(errorText);
      showNotification(`Error uploading to cloud: ${errorText}`, 'error');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const content = await file.text();
    let points: TrackPoint[] = [];

    if (file.name.endsWith('.csv')) points = parseCSV(content);
    else if (file.name.endsWith('.gpx')) points = parseGPX(content);
    else if (file.name.endsWith('.kml')) points = parseKML(content);

    setImportPoints(points);
  };

  const clearPoints = () => {
    Cookies.remove('lastTrackId');
    setTrackId(null);
    setTrackPoints([]);
    setImportPoints([]);
    setIsTracking(false);
    setTrackingStatus('idle');
    setTrackType('hiking');
    setHasCloudPoints(false);
    setMessage(undefined);
    setTrackName(null);
    showNotification('Track cleared', 'success');
  };

  const handleExport = async (
    format: string,
    storage: 'local' | 'cloud',
    filename: string,
    description: string,
    eventId: string,
    isPrivateStorage: boolean,
    exportTrackType: TrackType
  ) => {
    let content: string;
    let mimeType: string;
    setIsExporting(true);

    try {
      switch (format) {
        case 'gpx':
          content = generateGPX(trackPoints);
          mimeType = 'application/gpx+xml';
          break;
        case 'kml':
          content = generateKML(trackPoints);
          mimeType = 'application/vnd.google-earth.kml+xml';
          break;
        default: {
          const header = 'timestamp,latitude,longitude,elevation,comment\n';
          content = header + trackPoints.map(point =>
            `${point.timestamp},${point.latitude},${point.longitude},${point.elevation || ''},${point.comment || ''}`
          ).join('\n');
          mimeType = 'text/csv';
        }
      }

      const expfilename = `${eventId}_${groupId}.${format}`;

      if (storage === 'local') {
        const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
        saveAs(blob, expfilename);
        showNotification(`Track exported as ${format.toUpperCase()}`, 'success');
        return;
      }

      if (!wallet) {
        showNotification('Connect your wallet in Settings to upload tracks to cloud storage', 'error');
        return;
      }

      const totalDistance = getTotalDistance();
      const duration = getDuration();
      const elevationGain = getElevationGain();
      const transaction = await arweave.createTransaction({ data: content }, wallet);

      transaction.addTag('Content-Type', mimeType);
      transaction.addTag('App-Name', 'AllTracks');
      transaction.addTag('Track-ID', eventId);
      transaction.addTag('Group-ID', groupId);
      transaction.addTag('Description', description);
      transaction.addTag('Distance', totalDistance.toString());
      transaction.addTag('Duration', duration.toString());
      transaction.addTag('Elevation-Gain', elevationGain.toString());
      transaction.addTag('Start-Time', trackPoints[0].timestamp.toString());
      transaction.addTag('File-Type', 'track');
      if (principal) transaction.addTag('Owner', principal.toText());

      await arweave.transactions.sign(transaction, wallet);
      const response = await arweave.transactions.post(transaction);

      if (response.status === 200) {
        showNotification('Track uploaded to cloud storage', 'success');
        const result = await alltracks.createTrack({
          id: eventId,
          groupId: [groupId],
          name: filename,
          description,
          length: totalDistance,
          duration,
          elevation: elevationGain,
          startime: trackPoints[0].timestamp,
          trackfile: {
            fileType: mimeType,
            url: `${arweaveGateway}/${transaction.id}`
          },
          isPublic: !isPrivateStorage,
          startPoint: {
            latitude: trackPoints[0].latitude,
            longitude: trackPoints[0].longitude
          },
          trackType: exportTrackType,
        });

        if (result.error) showNotification(`Error creating track record: ${result.error}`, 'error');
        else showNotification(`Track record created: ${result.id}`, 'success');

        await clearTrackFromIndexDB(trackId);
        clearPoints();
      }
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'Unknown error';
      setMessage(errorText);
      showNotification(`Export failed: ${errorText}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleStartTrack = (trackSettings: {
    trackId: string;
    groupId: string;
    wallet: any;
    recordingMode: 'manual' | 'auto';
    autoRecordingSettings: {
      minTime: number;
      minDistance: number;
    };
    trackType: string;
    trackName?: string;
  }) => {
    Cookies.set('lastTrackId', trackSettings.trackId, { expires: 7 });
    Cookies.set('lastGroupId', trackSettings.groupId, { expires: 7 });

    setTrackId(trackSettings.trackId);
    if (trackSettings.trackName) setTrackName(trackSettings.trackName);
    setTrackType(trackSettings.trackType);
    setGroupId(trackSettings.groupId);
    setRecordingMode(trackSettings.recordingMode);
    setAutoRecordingSettings({ ...trackSettings.autoRecordingSettings, lastRecordedPosition: null });
    setShowStartModal(false);

    if (trackSettings.recordingMode === 'auto') startTracking();
  };

  const handleTrailSelect = async (trail: Trail) => {
    if (trail) {
      const response = await fetch(trail.trailfile.url);
      const content = await response.text();
      let points: TrackPoint[] = [];

      if (trail.trailfile.fileType === FILETYPE_GPX) points = parseGPX(content);
      else if (trail.trailfile.fileType === FILETYPE_KML) points = parseKML(content);
      else points = parseCSV(content);

      setImportPoints(points);
    }
    setShowTrailList(false);
  };

  return (
    <div className="App">
      <div className="hero-video-bg" aria-hidden="true">
        {shouldPlayHeroVideo && !trackId && (
          <video
            className="hero-video"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster="/hero-bg-poster.jpg"
          >
            <source src="/hero-bg.mp4" type="video/mp4" />
          </video>
        )}
        <div className="hero-video-overlay" />
      </div>

      <header className="App-header">
        {locationError && <div className="location-error">{locationError}</div>}
        {message && <div className="location-error">{message}</div>}

        {!trackId && (
          <div className="controls">
            <button onClick={() => setShowStartModal(true)}>Start Track</button>
          </div>
        )}

        {!showStartModal && trackId && (
          <div className="controls">
            {recordingMode === 'manual' ? (
              <div className="manual-controls">
                <button
                  onClick={recordPoint}
                  className="record-point-button"
                  style={{ background: '#1976d2', color: '#fff', opacity: 1, cursor: 'pointer' }}
                >
                  Record Point
                </button>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="finish-track-button"
                  disabled={trackPoints.length < 2 || isExporting}
                >
                  Finish
                </button>
              </div>
            ) : (
              <div className="auto-controls">
                {trackingStatus === 'idle' && (
                  <button onClick={startTracking}>Start</button>
                )}
                {trackingStatus === 'tracking' && (
                  <button onClick={pauseTracking}>Pause</button>
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
        )}

        {trackPoints.length > 0 && (
          <div className="stats">
            {trackName && <h3 style={{ margin: 0, marginBottom: 8 }}>{trackName}</h3>}
            {trackType && <p style={{ margin: 0, marginBottom: 12, fontSize: '14px', color: '#666', textTransform: 'capitalize' }}>{trackType}</p>}
            <p>Start time: {new Date(trackPoints[0].timestamp).toLocaleString()}</p>
            <p>Moving Time: {getMovingTime().toFixed(2)} hours</p>
            <p>Distance: {getTotalDistance().toFixed(2)} km</p>
            <p>Pace: {getPaceDisplay()}</p>
            <p>Elevation Gain: {getElevationGain().toFixed(1)} m</p>
            <p onClick={() => setShowPointsModal(true)} className="points-count-link">
              Recorded Points: <span className="clickable-count">{trackPoints.length}</span>
            </p>
            {isAuthed && hasCloudPoints && (
              <button
                onClick={() => {
                  const link = `${window.location.origin}/live/${trackId}`;
                  navigator.clipboard.writeText(link);
                  showNotification('Link copied to clipboard!', 'success');
                }}
                className="share-button"
                title="Share track"
              >
                <span className="material-icons">share</span>
              </button>
            )}
          </div>
        )}

        {viewMode === 'map' ? (
          <div className="main-map-container">
            <MapContainer
              center={getMapCenter() as [number, number]}
              zoom={9}
              style={{ height: '100%', width: '100%' }}
            >
              {autoCenter && hasUserLocation && <RecenterMap position={userLocation} />}
              <RecenterOnImport />
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
                      e.preventDefault();
                      setAutoCenter(!autoCenter);
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
                      setShowPoints(!showPoints);
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

              {hasUserLocation && (
                <Marker position={userLocation} icon={currentLocationIcon} />
              )}

              <Polyline positions={getPolylinePoints() as [number, number][]} color="red" />
              <Polyline
                positions={getPolylineImportPoints() as [number, number][]}
                color="#FF4081"
                weight={4}
                opacity={0.8}
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
                {trackPoints.map((point) => (
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
          <div className="import-dropdown" ref={dropdownRef}>
            <button
              className="import-dropdown-trigger"
              onClick={() => setShowImportOptions(!showImportOptions)}
            >
              <span className="material-icons">file_upload</span>
              Import
            </button>
            {showImportOptions && (
              <div className="import-dropdown-menu">
                <button onClick={() => {
                  document.getElementById('file-upload')?.click();
                  setShowImportOptions(false);
                }}>
                  <span className="material-icons">folder</span>
                  Local
                </button>
                <button onClick={() => {
                  setShowTrailList(true);
                  setShowImportOptions(false);
                }}>
                  <span className="material-icons">cloud_download</span>
                  Cloud
                </button>
              </div>
            )}
          </div>

          <button onClick={() => setShowExportModal(true)} disabled={trackPoints.length < 2 || isExporting}>
            Export
          </button>
          <button onClick={() => setShowClearModal(true)} disabled={!trackId && trackPoints.length === 0}>
            Clear
          </button>
        </div>
      </header>

      {!trackId && (
        <>
          <div className="feature-highlights">
            <div className="feature-card">
              <span className="material-icons">location_history</span>
              <h3>Track Your Journey</h3>
              <p>Record your path and revisit where you've been</p>
            </div>
            <div className="feature-card">
              <span className="material-icons">share_location</span>
              <h3>Live Location Sharing</h3>
              <p>Keep family updated with your real-time location</p>
            </div>
            <div className="feature-card">
              <span className="material-icons">warning</span>
              <h3>Incident Reporting</h3>
              <p>Mark and share important points of interest or hazards</p>
            </div>
          </div>

          <footer className="home-footer">
            <a href="https://icevent.app" className="footer-link" target="_blank" rel="noreferrer">
              <span className="material-icons">event</span>
              Events
            </a>
            <a href="/everpeace" className="footer-link">
              <span className="material-icons">terrain</span>
              Everpeace
            </a>
            <a
              href="#"
              className="footer-link"
              onClick={(e) => {
                e.preventDefault();
                setShowFeedbackModal(true);
              }}
            >
              <span className="material-icons">feedback</span>
              Feedback
            </a>
          </footer>
        </>
      )}

      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        showNotification={showNotification}
        user={principal ? principal.toText() : null}
      />

      {showCommentModal && (
        <CommentModal
          onSave={(data) => {
            savePointWithComment(data);
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
          trackId={trackId}
          groupId={groupId}
        />
      )}

      {showPointsModal && (
        <TrackPointsModal
          points={trackPoints}
          onClose={() => setShowPointsModal(false)}
          onRemove={(timestamp) => {
            setTrackPoints(prev => prev.filter(point => point.timestamp !== timestamp));
          }}
        />
      )}

      {showStartModal && (
        <StartTrackModal
          onClose={() => setShowStartModal(false)}
          onStart={handleStartTrack}
        />
      )}

      {showClearModal && (
        <ClearTracksModal
          onClose={() => setShowClearModal(false)}
          onClear={() => {
            clearPoints();
            setShowClearModal(false);
          }}
        />
      )}

      {showTrailList && (
        <TrailListModal
          onSelect={handleTrailSelect}
          onClose={() => setShowTrailList(false)}
        />
      )}
    </div>
  );
}

export default MainApp;
