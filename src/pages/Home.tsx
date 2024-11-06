import React, { useState, useEffect } from 'react';
import { Map } from '../components/Map';
import { TrackControls } from '../components/TrackControls';
import { CommentModal } from '../components/CommentModal';
import { ExportModal } from '../components/ExportModal';
import { TrackPointsModal } from '../components/TrackPointsModal';
import { TrackPoint } from '../utils/exportFormats';
import { User } from '@junobuild/core';
import { generateGPX, generateKML } from '../utils/exportFormats';
import { Navbar } from '../components/Navbar';

export const Home: React.FC<{ user: User | null; onLogin: () => Promise<void> }> = ({ user, onLogin }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const [trackingInterval, setTrackingInterval] = useState<NodeJS.Timer | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [userLocation, setUserLocation] = useState<[number, number]>([49.2827, -123.1207]);
  
  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      position => setCurrentLocation(position),
      error => console.error('Location error:', error),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);
  
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
  const handleStartTracking = () => {
    setIsTracking(true);
    const interval = setInterval(() => {
      if (currentLocation) {
        const newPoint: TrackPoint = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          elevation: currentLocation.coords.altitude || undefined,
          timestamp: Date.now()
        };
        setTrackPoints(prev => [...prev, newPoint]);
      }
    }, 5000); // Record every 5 seconds
    setTrackingInterval(interval);
  };

  const handleStopTracking = () => {
    setIsTracking(false);
    if (trackingInterval) {
      clearInterval(trackingInterval);
      setTrackingInterval(null);
    }
  };

  const handlePauseTracking = () => {
    if (trackingInterval) {
      clearInterval(trackingInterval);
      setTrackingInterval(null);
    }
  };

  const handleResumeTracking = () => {
    handleStartTracking();
  };

  const handleRecordPoint = () => {
    if (currentLocation) {
      const newPoint: TrackPoint = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        elevation: currentLocation.coords.altitude || undefined,
        timestamp: Date.now()
      };
      setTrackPoints(prev => [...prev, newPoint]);
      setShowCommentModal(true);
    }
  };

  const handleExport = (format: string, storage: 'local' | 'cloud', filename: string, description: string) => {
    let content: string;
    switch (format) {
      case 'gpx':
        content = generateGPX(trackPoints);
        break;
      case 'kml':
        content = generateKML(trackPoints);
        break;
      default:
        content = JSON.stringify(trackPoints);
    }

    if (storage === 'local') {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Cloud storage logic here
    }
    setShowExportModal(false);
  };

  return (
    
    <div className="App">
        <Navbar  />
        <header className="App-header">
        {locationError && (
          <div className="location-error">
            {locationError}
          </div>
        )}
        <TrackControls 
        isTracking={isTracking}
        onStartTracking={handleStartTracking}
        onStopTracking={handleStopTracking}
        onExport={() => setShowExportModal(true)}
        onShowPoints={() => setShowPointsModal(true)}
        onAddComment={() => setShowCommentModal(true)}
        onRecordPoint={handleRecordPoint}
        onPauseTracking={handlePauseTracking}
        onResumeTracking={handleResumeTracking}
      />
      
      <Map 
        trackPoints={trackPoints}
        isTracking={isTracking}
        onAddPoint={handleRecordPoint}
      />
      
      </header>

      {showCommentModal && (
        <CommentModal 
          onSave={(data) => {
            if (trackPoints.length > 0) {
              const lastPoint = trackPoints[trackPoints.length - 1];
              const updatedPoint = { ...lastPoint, comment:data.comment };
              setTrackPoints(prev => [...prev.slice(0, -1), updatedPoint]);
            }
            setShowCommentModal(false);
          }}
          onClose={() => setShowCommentModal(false)}
          user={user}
        />
      )}

      {showExportModal && (
        <ExportModal 
          onExport={handleExport}
          onClose={() => setShowExportModal(false)}
          user={user}
          onLogin={onLogin}
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
};