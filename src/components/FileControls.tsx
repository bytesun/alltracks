import React from 'react';
import { TrackPoint } from '../utils/exportFormats';

interface FileControlsProps {
  trackPoints: TrackPoint[];
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
  onClear: () => void;
}

export const FileControls: React.FC<FileControlsProps> = ({
  trackPoints,
  onImport,
  onExport,
  onClear
}) => {
  return (
    <div className="bottom-controls">
      <input
        type="file"
        accept=".csv,.gpx,.kml"
        onChange={onImport}
        style={{ display: 'none' }}
        id="file-upload"
      />
      <button onClick={() => document.getElementById('file-upload')?.click()}>
        Import
      </button>
      <button onClick={onExport} disabled={trackPoints.length === 0}>
        Export
      </button>
      <button onClick={onClear} disabled={trackPoints.length === 0}>
        Clear
      </button>
    </div>
  );
};
