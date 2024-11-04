import { useMemo } from 'react';
import { TrackPoint } from '../utils/exportFormats';
import { calculateAverageSpeed } from '../utils/trackCalculations';
import { calculateTotalAscent, calculateTotalDistance } from '../utils/trackCalculations';
import { getDuration } from '../utils/trackCalculations';
import { calculateSimilarityScore } from '../utils/trackCalculations';

interface ComparisonMetrics {
  speedDiff: number;
  elevationDiff: number;
  timeDiff: number;
  distanceDiff: number;
  similarityScore: number;
}

export const useTrackComparison = (trackA: TrackPoint[], trackB: TrackPoint[]) => {
  const comparison = useMemo((): ComparisonMetrics => {
    const speedA = calculateAverageSpeed(trackA);
    const speedB = calculateAverageSpeed(trackB);
    
    const elevationA = calculateTotalAscent(trackA);
    const elevationB = calculateTotalAscent(trackB);
    
    const timeA = getDuration(trackA);
    const timeB = getDuration(trackB);
    
    const distanceA = calculateTotalDistance(trackA);
    const distanceB = calculateTotalDistance(trackB);

    const similarityScore = calculateSimilarityScore(trackA, trackB);

    return {
      speedDiff: speedB - speedA,
      elevationDiff: elevationB - elevationA,
      timeDiff: timeB - timeA,
      distanceDiff: distanceB - distanceA,
      similarityScore
    };
  }, [trackA, trackB]);

  return comparison;
};
