import { useState, useCallback } from 'react';
import { TrackPoint } from '../utils/exportFormats';

export const useTracking = () => {
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [recordingMode, setRecordingMode] = useState<'manual' | 'auto'>('manual');
  const [trackingStatus, setTrackingStatus] = useState<'idle' | 'tracking' | 'paused'>('idle');
  const [recordingInterval, setRecordingInterval] = useState<NodeJS.Timer | null>(null);

  const startTracking = useCallback(() => {
    setTrackingStatus('tracking');
    // Start recording logic
  }, []);

  const stopTracking = useCallback(() => {
    setTrackingStatus('idle');
    if (recordingInterval) {
      clearInterval(recordingInterval);
      setRecordingInterval(null);
    }
  }, [recordingInterval]);

  const addPoint = useCallback((point: TrackPoint) => {
    setTrackPoints(prev => [...prev, point]);
  }, []);

  return {
    trackPoints,
    recordingMode,
    trackingStatus,
    startTracking,
    stopTracking,
    addPoint,
    setRecordingMode
  };
};
