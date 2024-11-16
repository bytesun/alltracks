import { useState } from 'react';
import { TrackPoint } from '../types/TrackPoint';
import { parseCSV, parseGPX, parseKML } from '../utils/importFormats';

export const useTrackImport = (onPointsImported: (points: TrackPoint[]) => void) => {
  const [isImporting, setIsImporting] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const content = await file.text();
      let points: TrackPoint[] = [];

      if (file.name.endsWith('.csv')) {
        points = parseCSV(content);
      } else if (file.name.endsWith('.gpx')) {
        points = parseGPX(content);
      } else if (file.name.endsWith('.kml')) {
        points = parseKML(content);
      }

      onPointsImported(points);
    } finally {
      setIsImporting(false);
    }
  };

  return {
    isImporting,
    handleFileUpload
  };
};
