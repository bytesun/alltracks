import React from 'react';
import { calculateDistance } from '../utils/trackCalculations';
import { TrackPoint } from '../utils/exportFormats';

interface TrackStatsProps {
  trackPoints: TrackPoint[];
  onShowPoints: () => void;
}

export const TrackStats: React.FC<TrackStatsProps> = ({ trackPoints, onShowPoints }) => {
  const getTotalDistance = () => {
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

  const getElevationGain = () => {
    let gain = 0;
    for (let i = 1; i < trackPoints.length; i++) {
      const diff = (trackPoints[i].elevation ?? 0) - (trackPoints[i - 1].elevation ?? 0);
      if (diff > 0) gain += diff;
    }
    return gain.toFixed(1);
  };

  const getDuration = () => {
    if (trackPoints.length < 2) return '0:00';
    const startTime = trackPoints[0].timestamp;
    const endTime = trackPoints[trackPoints.length - 1].timestamp;
    const hours = Math.floor((endTime - startTime) / (1000 * 60 * 60));
    const minutes = Math.floor(((endTime - startTime) % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="stats">
      <p>Start time: {trackPoints.length > 0 ? new Date(trackPoints[0].timestamp).toLocaleString() : '-'}</p>
      <p>Duration: {getDuration()} hours</p>
      <p>Distance: {getTotalDistance()} km</p>
      <p>Elevation Gain: {getElevationGain()} m</p>
      <p className="points-count-link" onClick={onShowPoints}>
        Recorded Points: <span className="clickable-count">{trackPoints.length}</span>
      </p>
    </div>
  );
};
