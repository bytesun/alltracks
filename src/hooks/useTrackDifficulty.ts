import { useMemo } from 'react';
import { TrackPoint } from '../utils/exportFormats';
import { calculateGradientFactor } from '../utils/trackCalculations';

interface DifficultyMetrics {
  technicalDifficulty: number;
  physicalDifficulty: number;
  overallDifficulty: number;
  steepSections: { start: number; end: number; gradient: number }[];
  difficultyFactors: {
    elevation: number;
    distance: number;
    gradient: number;
    terrain: number;
  };
}

export const useTrackDifficulty = (trackPoints: TrackPoint[]) => {
  const difficultyMetrics = useMemo((): DifficultyMetrics => {
    const steepSections = [];
    let currentSteepSection: { start: number; end: number; gradient: number } | null = null;
    
    for (let i = 1; i < trackPoints.length; i++) {
      const gradient = calculateGradient(trackPoints[i-1], trackPoints[i]);
      
      if (Math.abs(gradient) > 15) {
        if (!currentSteepSection) {
          currentSteepSection = {
            start: i-1,
            end: i,
            gradient
          };
        } else {
          currentSteepSection.end = i;
        }
      } else if (currentSteepSection) {
        steepSections.push(currentSteepSection);
        currentSteepSection = null;
      }
    }

    const elevationFactor = calculateElevationFactor(trackPoints);
    const distanceFactor = calculateDistanceFactor(trackPoints);
    const gradientFactor = calculateGradientFactor(trackPoints);
    const terrainFactor = 1.0; // Default terrain factor

    const technicalDifficulty = (gradientFactor + terrainFactor) / 2;
    const physicalDifficulty = (elevationFactor + distanceFactor) / 2;

    return {
      technicalDifficulty,
      physicalDifficulty,
      overallDifficulty: (technicalDifficulty + physicalDifficulty) / 2,
      steepSections,
      difficultyFactors: {
        elevation: elevationFactor,
        distance: distanceFactor,
        gradient: gradientFactor,
        terrain: terrainFactor
      }
    };
  }, [trackPoints]);

  return difficultyMetrics;
};

import { calculateGradient, calculateElevationFactor, calculateDistanceFactor } from '../utils/trackCalculations';
