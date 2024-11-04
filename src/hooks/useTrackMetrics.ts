import { useMemo } from 'react';
import { TrackPoint } from '../utils/exportFormats';

export const useTrackMetrics = (trackPoints: TrackPoint[]) => {
  const metrics = useMemo(() => {
    const getAverageSpeed = () => {
      if (trackPoints.length < 2) return 0;
      const distance = getTotalDistance();
      const duration = getDurationInHours();
      return duration > 0 ? distance / duration : 0;
    };

    const getDurationInHours = () => {
      if (trackPoints.length < 2) return 0;
      const milliseconds = trackPoints[trackPoints.length - 1].timestamp - trackPoints[0].timestamp;
      return milliseconds / (1000 * 60 * 60);
    };

    const getTotalDistance = () => {
      let total = 0;
      for (let i = 1; i < trackPoints.length; i++) {
        const R = 6371; // Earth's radius in km
        const lat1 = trackPoints[i-1].latitude * Math.PI / 180;
        const lat2 = trackPoints[i].latitude * Math.PI / 180;
        const dLat = lat2 - lat1;
        const dLon = (trackPoints[i].longitude - trackPoints[i-1].longitude) * Math.PI / 180;
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                 Math.cos(lat1) * Math.cos(lat2) * 
                 Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        total += R * c;
      }
      return total;
    };

    return {
      averageSpeed: getAverageSpeed(),
      totalDistance: getTotalDistance(),
      duration: getDurationInHours(),
      pointCount: trackPoints.length
    };
  }, [trackPoints]);

  return metrics;
};
