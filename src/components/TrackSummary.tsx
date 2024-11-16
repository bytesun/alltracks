import React from 'react';
import { TrackPoint } from '../types/TrackPoint';

interface TrackSummaryProps {
  trackPoints: TrackPoint[];
  onEdit: () => void;
}

export const TrackSummary: React.FC<TrackSummaryProps> = ({ trackPoints, onEdit }) => {
  const startTime = new Date(trackPoints[0]?.timestamp).toLocaleString();
  const endTime = new Date(trackPoints[trackPoints.length - 1]?.timestamp).toLocaleString();

  return (
    <div className="track-summary">
      <div className="summary-header">
        <h3>Track Summary</h3>
        <button onClick={onEdit} className="edit-button">
          <span className="material-icons">edit</span>
        </button>
      </div>
      <div className="summary-content">
        <div className="summary-item">
          <label>Start:</label>
          <span>{startTime}</span>
        </div>
        <div className="summary-item">
          <label>End:</label>
          <span>{endTime}</span>
        </div>
        <div className="summary-item">
          <label>Points:</label>
          <span>{trackPoints.length}</span>
        </div>
      </div>
    </div>
  );
};
