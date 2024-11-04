import { useMemo } from 'react';
import { TrackPoint } from '../utils/exportFormats';

export const useTrackStats = (trackPoints: TrackPoint[]) => {
  const stats = useMemo(() => {
    const calculateDistance = () => {
      if (trackPoints.length < 2) return '0.00';
      let total = 0;
      for (let i = 1; i < trackPoints.length; i++) {
        const R = 6371;
        const dLat = (trackPoints[i].latitude - trackPoints[i-1].latitude) * Math.PI / 180;
        const dLon = (trackPoints[i].longitude - trackPoints[i-1].longitude) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(trackPoints[i-1].latitude * Math.PI / 180) * 
          Math.cos(trackPoints[i].latitude * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        total += R * c;
      }
      return total.toFixed(2);
    };

    const calculateElevationGain = () => {
      let gain = 0;
      for (let i = 1; i < trackPoints.length; i++) {
        const diff = (trackPoints[i].elevation ?? 0) - (trackPoints[i-1].elevation ?? 0);
        if (diff > 0) gain += diff;
      }
      return gain.toFixed(1);
    };

    return {
      distance: calculateDistance(),
      elevationGain: calculateElevationGain(),
      pointCount: trackPoints.length,
      startTime: trackPoints[0]?.timestamp ? new Date(trackPoints[0].timestamp).toLocaleString() : '-'
    };
  }, [trackPoints]);

  return stats;
};
