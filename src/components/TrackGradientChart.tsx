import React from 'react';
import { TrackPoint } from '../utils/exportFormats';

interface TrackGradientChartProps {
  trackPoints: TrackPoint[];
  width?: number;
  height?: number;
}

export const TrackGradientChart: React.FC<TrackGradientChartProps> = ({
  trackPoints,
  width = 600,
  height = 200
}) => {
  const gradients = calculateGradients(trackPoints);
  const maxGradient = Math.max(...gradients.map(Math.abs));

  const getGradientColor = (gradient: number) => {
    if (gradient > 0) return `rgb(255, ${255 - (gradient/maxGradient) * 255}, 0)`;
    return `rgb(0, ${255 - (Math.abs(gradient)/maxGradient) * 255}, 255)`;
  };

  return (
    <div className="gradient-chart">
      <div className="gradient-bars">
        {gradients.map((gradient, index) => (
          <div
            key={index}
            className="gradient-bar"
            style={{
              height: `${(Math.abs(gradient)/maxGradient) * 100}%`,
              backgroundColor: getGradientColor(gradient),
              width: `${width/gradients.length}px`
            }}
          />
        ))}
      </div>
      <div className="gradient-labels">
        <span>+{maxGradient.toFixed(1)}%</span>
        <span>0%</span>
        <span>-{maxGradient.toFixed(1)}%</span>
      </div>
    </div>
  );
};

import { calculateGradients } from '../utils/trackCalculations';
