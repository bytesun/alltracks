import { useMemo } from 'react';
import { TrackPoint } from '../utils/exportFormats';
import { calculateDistance ,calculateCentroid} from '../utils/trackCalculations';

interface Cluster {
  centroid: TrackPoint;
  points: TrackPoint[];
  radius: number;
}

export const useTrackClustering = (trackPoints: TrackPoint[], clusterRadius: number = 50) => {
  const clusters = useMemo((): Cluster[] => {
    const clusters: Cluster[] = [];
    const processed = new Set<number>();

    trackPoints.forEach((point, index) => {
      if (processed.has(index)) return;

      const clusterPoints = trackPoints.filter((p, i) => {
        if (processed.has(i)) return false;
        
        const distance = calculateDistance(
          point.latitude,
          point.longitude,
          p.latitude,
          p.longitude
        ) * 1000; // Convert to meters
        
        return distance <= clusterRadius;
      });

      if (clusterPoints.length > 0) {
        const centroid = calculateCentroid(clusterPoints);
        clusters.push({
          centroid,
          points: clusterPoints,
          radius: clusterRadius
        });

        clusterPoints.forEach((_, i) => processed.add(i));
      }
    });

    return clusters;
  }, [trackPoints, clusterRadius]);

  return clusters;
};

