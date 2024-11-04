import React from 'react';
import { TrackPoint } from '../utils/exportFormats';

interface TrackHeatmapProps {
  trackPoints: TrackPoint[];
  width?: number;
  height?: number;
  colorScale?: string[];
}

export const TrackHeatmap: React.FC<TrackHeatmapProps> = ({
  trackPoints,
  width = 800,
  height = 400,
  colorScale = ['#00ff00', '#ffff00', '#ff0000']
}) => {
  const densityData = calculateDensity(trackPoints);
  const maxDensity = Math.max(...densityData.map(d => d.density));

  return (
    <div className="track-heatmap">
      <svg width={width} height={height}>
        {densityData.map((point, index) => (
          <circle
            key={index}
            cx={point.x * width}
            cy={point.y * height}
            r={5}
            fill={getColorForDensity(point.density, maxDensity, colorScale)}
            opacity={0.7}
          />
        ))}
      </svg>
    </div>
  );
};

import { calculateDensity } from '../utils/trackCalculations';

const getColorForDensity = (
  density: number, 
  maxDensity: number, 
  colorScale: string[]
): string => {
  const ratio = density / maxDensity;
  const index = Math.floor(ratio * (colorScale.length - 1));
  return colorScale[index];
};
