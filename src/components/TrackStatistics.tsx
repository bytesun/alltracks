import React from 'react';
import { TrackPoint } from '../types/TrackPoint';
import { formatDuration } from '../utils/trackCalculations';
import { calculateMovingTime } from '../utils/trackCalculations';
import { calculateTotalAscent } from '../utils/trackCalculations';
import { calculateAverageSpeed } from '../utils/trackCalculations';

interface TrackStatisticsProps {
  trackPoints: TrackPoint[];
  showDetailed?: boolean;
}

export const TrackStatistics: React.FC<TrackStatisticsProps> = ({
  trackPoints,
  showDetailed = false
}) => {
  return (
    <div className="track-statistics">
      <div className="stats-grid">
        <div className="stat-card">
          <span className="material-icons">speed</span>
          <div className="stat-content">
            <h4>Average Speed</h4>
            <p>{calculateAverageSpeed(trackPoints).toFixed(1)} km/h</p>
          </div>
        </div>
        <div className="stat-card">
          <span className="material-icons">trending_up</span>
          <div className="stat-content">
            <h4>Max Elevation</h4>
            <p>{Math.max(...trackPoints.map(p => p.elevation ?? 0)).toFixed(0)}m</p>
          </div>
        </div>
        {showDetailed && (
          <>
            <div className="stat-card">
              <span className="material-icons">timer</span>
              <div className="stat-content">
                <h4>Moving Time</h4>
                <p>{formatDuration(calculateMovingTime(trackPoints))}</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="material-icons">landscape</span>
              <div className="stat-content">
                <h4>Total Ascent</h4>
                <p>{calculateTotalAscent(trackPoints).toFixed(0)}m</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

