import React from 'react';
import { TrackPoint } from '../utils/exportFormats';

interface TrackSegmentsProps {
  trackPoints: TrackPoint[];
  segmentSize: number;
  onSegmentClick: (segmentIndex: number) => void;
}

export const TrackSegments: React.FC<TrackSegmentsProps> = ({
  trackPoints,
  segmentSize,
  onSegmentClick
}) => {
  const segments = [];
  for (let i = 0; i < trackPoints.length; i += segmentSize) {
    segments.push(trackPoints.slice(i, i + segmentSize));
  }

  return (
    <div className="track-segments">
      {segments.map((segment, index) => (
        <div 
          key={index}
          className="segment-card"
          onClick={() => onSegmentClick(index)}
        >
          <h4>Segment {index + 1}</h4>
          <div className="segment-stats">
            <p>Points: {segment.length}</p>
            <p>Start: {new Date(segment[0].timestamp).toLocaleTimeString()}</p>
            <p>End: {new Date(segment[segment.length-1].timestamp).toLocaleTimeString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
};
