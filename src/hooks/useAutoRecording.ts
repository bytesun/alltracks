import { useState, useCallback } from 'react';
import { TrackPoint } from '../types/TrackPoint';

interface AutoRecordingSettings {
  minDistance: number;
  minTime: number;
  lastRecordedPosition: TrackPoint | null;
}

export const useAutoRecording = (onPointRecorded: (point: TrackPoint) => void) => {
  const [settings, setSettings] = useState<AutoRecordingSettings>({
    minDistance: 10,
    minTime: 10,
    lastRecordedPosition: null
  });

  const [recordingInterval, setRecordingInterval] = useState<ReturnType<typeof setTimeout> | null>(null);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Convert to meters
  };

  const shouldRecordNewPoint = useCallback((position: GeolocationPosition): boolean => {
    if (!settings.lastRecordedPosition) return true;

    const timeDiff = (position.timestamp - settings.lastRecordedPosition.timestamp) / 1000;
    if (timeDiff < settings.minTime) return false;

    const distance = calculateDistance(
      settings.lastRecordedPosition.latitude,
      settings.lastRecordedPosition.longitude,
      position.coords.latitude,
      position.coords.longitude
    );

    return distance >= settings.minDistance;
  }, [settings]);

  const startRecording = useCallback(() => {
    const newInterval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (shouldRecordNewPoint(position)) {
            const newPoint: TrackPoint = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              timestamp: position.timestamp,
              elevation: position.coords.altitude || undefined
            };
            onPointRecorded(newPoint);
            setSettings(prev => ({
              ...prev,
              lastRecordedPosition: newPoint
            }));
          }
        }
      );
    }, 1000);
    
    setRecordingInterval(newInterval);
  }, [shouldRecordNewPoint, onPointRecorded]);

  const stopRecording = useCallback(() => {
    if (recordingInterval) {
      clearInterval(recordingInterval);
      setRecordingInterval(null);
    }
  }, [recordingInterval]);

  return {
    settings,
    setSettings,
    startRecording,
    stopRecording,
    recordingInterval
  };
};