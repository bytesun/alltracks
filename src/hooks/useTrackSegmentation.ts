import { useState, useMemo } from 'react';
import { TrackPoint } from '../utils/exportFormats';

interface Segment {
  points: TrackPoint[];
  distance: number;
  elevationGain: number;
  duration: number;
}

export const useTrackSegmentation = (trackPoints: TrackPoint[]) => {
  const [segmentSize, setSegmentSize] = useState(10);

  const segments = useMemo((): Segment[] => {
    const result: Segment[] = [];
    
    for (let i = 0; i < trackPoints.length; i += segmentSize) {
      const segmentPoints = trackPoints.slice(i, i + segmentSize);
      
      let distance = 0;
      let elevationGain = 0;
      
      for (let j = 1; j < segmentPoints.length; j++) {
        // Calculate segment distance
        distance += calculateDistance(
          segmentPoints[j-1].latitude,
          segmentPoints[j-1].longitude,
          segmentPoints[j].latitude,
          segmentPoints[j].longitude
        );
        
        // Calculate elevation gain
        const elevDiff = (segmentPoints[j].elevation ?? 0) - (segmentPoints[j-1].elevation ?? 0);
        if (elevDiff > 0) elevationGain += elevDiff;
      }

      const duration = (segmentPoints[segmentPoints.length-1].timestamp - segmentPoints[0].timestamp) / 1000;

      result.push({
        points: segmentPoints,
        distance,
        elevationGain,
        duration
      });
    }

    return result;
  }, [trackPoints, segmentSize]);

  return {
    segments,
    segmentSize,
    setSegmentSize
  };
};

import { calculateDistance } from '../utils/trackCalculations';
