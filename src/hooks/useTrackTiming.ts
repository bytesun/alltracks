import { useMemo } from 'react';
import { TrackPoint } from "../types/TrackPoint";

interface TimingData {
  totalTime: number;
  movingTime: number;
  stoppedTime: number;
  averageMovingSpeed: number;
  timeSegments: {
    start: number;
    end: number;
    isMoving: boolean;
  }[];
}

export const useTrackTiming = (trackPoints: TrackPoint[], speedThreshold: number = 0.5) => {
  const timingData = useMemo((): TimingData => {
    const segments = [];
    let movingTime = 0;
    let lastSegmentStart = trackPoints[0]?.timestamp;
    let isMoving = false;

    for (let i = 1; i < trackPoints.length; i++) {
      const speed = calculateInstantSpeed(
        trackPoints[i-1],
        trackPoints[i]
      );

      const currentlyMoving = speed > speedThreshold;

      if (currentlyMoving !== isMoving) {
        segments.push({
          start: lastSegmentStart,
          end: trackPoints[i].timestamp,
          isMoving
        });
        lastSegmentStart = trackPoints[i].timestamp;
        isMoving = currentlyMoving;
      }

      if (currentlyMoving) {
        movingTime += trackPoints[i].timestamp - trackPoints[i-1].timestamp;
      }
    }

    const totalTime = trackPoints[trackPoints.length - 1].timestamp - trackPoints[0].timestamp;

    return {
      totalTime,
      movingTime,
      stoppedTime: totalTime - movingTime,
      averageMovingSpeed: calculateTotalDistance(trackPoints) / (movingTime / 1000 / 3600),
      timeSegments: segments
    };
  }, [trackPoints, speedThreshold]);

  return timingData;
};

import { calculateInstantSpeed, calculateTotalDistance } from '../utils/trackCalculations';
