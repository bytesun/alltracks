import { useMemo } from 'react';
import { TrackPoint } from '../utils/exportFormats';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const useTrackValidation = (trackPoints: TrackPoint[]) => {
  const validation = useMemo((): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (trackPoints.length < 2) {
      errors.push('Track must have at least 2 points');
    }

    // Check for time sequence
    for (let i = 1; i < trackPoints.length; i++) {
      if (trackPoints[i].timestamp <= trackPoints[i-1].timestamp) {
        errors.push(`Invalid time sequence at point ${i}`);
      }
    }

    // Check for reasonable coordinates
    trackPoints.forEach((point, index) => {
      if (point.latitude < -90 || point.latitude > 90) {
        errors.push(`Invalid latitude at point ${index}`);
      }
      if (point.longitude < -180 || point.longitude > 180) {
        errors.push(`Invalid longitude at point ${index}`);
      }
    });

    // Check for large gaps
    for (let i = 1; i < trackPoints.length; i++) {
      const timeDiff = trackPoints[i].timestamp - trackPoints[i-1].timestamp;
      if (timeDiff > 3600000) { // 1 hour
        warnings.push(`Large time gap (${Math.round(timeDiff/1000/60)} minutes) between points ${i-1} and ${i}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [trackPoints]);

  return validation;
};
