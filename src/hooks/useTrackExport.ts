import { useState } from 'react';
import { TrackPoint } from '../types/TrackPoint';
import { calculateTotalDistance, calculateTotalAscent } from '../utils/trackCalculations';
import { ExportHandler } from '../utils/ExportHandler';
import { setDoc } from '@junobuild/core';
import { v4 as uuidv4 } from 'uuid';

export const useTrackExport = (trackPoints: TrackPoint[]) => {
  const [filename, setFilename] = useState('');
  const [description, setDescription] = useState('');

  const handleExport = async (format: string, storage: 'local' | 'cloud', name: string, desc: string) => {
    try {
      const distance = calculateTotalDistance(trackPoints);
      const elevationGain = calculateTotalAscent(trackPoints);
      
      await ExportHandler.exportTrack(
        trackPoints,
        format,
        storage,
        name,
        desc,
        distance,
        elevationGain
      );

      await setDoc({
        collection: "tracks",
        doc: {
          key: uuidv4(),
          data: {
            filename: name,
            description: desc,
            distance,
            elevationGain
          }
        }
      });
    } finally {
      setFilename('');
      setDescription('');
    }
  };

  return { handleExport };
};