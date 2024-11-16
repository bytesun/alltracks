import React from 'react';
import { TrackPoint } from '../types/TrackPoint';
import { calculateSpeeds } from '../utils/trackCalculations';

interface TrackSpeedChartProps {
  trackPoints: TrackPoint[];
  width?: number;
  height?: number;
}

export const TrackSpeedChart: React.FC<TrackSpeedChartProps> = ({
  trackPoints,
  width = 600,
  height = 200
}) => {
  const speeds = calculateSpeeds(trackPoints);
  const maxSpeed = Math.max(...speeds);
  
  const points = speeds.map((speed, index) => ({
    x: (index / (speeds.length - 1)) * width,
    y: height - (speed / maxSpeed) * height
  }));

  return (
    <div className="speed-chart">
      <svg width={width} height={height}>
        <path
          d={points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
          stroke="#4CAF50"
          strokeWidth="2"
          fill="none"
        />
      </svg>
      <div className="speed-labels">
        <span>{Math.round(maxSpeed)} km/h</span>
        <span>0 km/h</span>
      </div>
    </div>
  );
};
