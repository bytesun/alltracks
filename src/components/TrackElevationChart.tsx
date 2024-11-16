import React from 'react';
import { TrackPoint } from '../types/TrackPoint';
interface TrackElevationChartProps {
  trackPoints: TrackPoint[];
  width?: number;
  height?: number;
}

export const TrackElevationChart: React.FC<TrackElevationChartProps> = ({
  trackPoints,
  width = 600,
  height = 200
}) => {
  const elevations = trackPoints
    .map(point => point.elevation ?? 0);
  
  const maxElevation = Math.max(...elevations);
  const minElevation = Math.min(...elevations);
  
  const points = elevations.map((elevation, index) => ({
    x: (index / (elevations.length - 1)) * width,
    y: height - ((elevation - minElevation) / (maxElevation - minElevation)) * height
  }));

  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  return (
    <div className="elevation-chart">
      <svg width={width} height={height}>
        <path
          d={pathData}
          stroke="#2196F3"
          strokeWidth="2"
          fill="none"
        />
      </svg>
      <div className="elevation-labels">
        <span>{Math.round(maxElevation)}m</span>
        <span>{Math.round(minElevation)}m</span>
      </div>
    </div>
  );
};
