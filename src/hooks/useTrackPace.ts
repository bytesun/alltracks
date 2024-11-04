import { useMemo } from 'react';
import { TrackPoint } from '../utils/exportFormats';
import { calculateDistance } from '../utils/trackCalculations';

interface PaceData {
  currentPace: number;
  averagePace: number;
  bestPace: number;
  paceHistory: number[];
  splits: { distance: number; time: number }[];
}

export const useTrackPace = (trackPoints: TrackPoint[]) => {
  const paceData = useMemo((): PaceData => {
    const paces: number[] = [];
    const splits: { distance: number; time: number }[] = [];
    let totalDistance = 0;
    let lastSplitDistance = 0;
    let lastSplitTime = trackPoints[0]?.timestamp || 0;

    for (let i = 1; i < trackPoints.length; i++) {
      const distance = calculateDistance(
        trackPoints[i-1].latitude,
        trackPoints[i-1].longitude,
        trackPoints[i].latitude,
        trackPoints[i].longitude
      );
      
      const timeDiff = (trackPoints[i].timestamp - trackPoints[i-1].timestamp) / 1000 / 60; // minutes
      const pace = timeDiff / (distance / 1000); // min/km
      paces.push(pace);

      totalDistance += distance;
      if (totalDistance - lastSplitDistance >= 1000) { // Every kilometer
        splits.push({
          distance: totalDistance,
          time: trackPoints[i].timestamp - lastSplitTime
        });
        lastSplitDistance = totalDistance;
        lastSplitTime = trackPoints[i].timestamp;
      }
    }

    return {
      currentPace: paces[paces.length - 1] || 0,
      averagePace: paces.reduce((a, b) => a + b, 0) / paces.length,
      bestPace: Math.min(...paces),
      paceHistory: paces,
      splits
    };
  }, [trackPoints]);

  return paceData;
};
