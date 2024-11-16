import React, { useState } from 'react';
import { TrackPoint } from '../types/TrackPoint';

interface TrackFilterProps {
  onFilter: (filteredPoints: TrackPoint[]) => void;
  trackPoints: TrackPoint[];
}

export const TrackFilter: React.FC<TrackFilterProps> = ({ onFilter, trackPoints }) => {
  const [minElevation, setMinElevation] = useState<number | ''>('');
  const [maxElevation, setMaxElevation] = useState<number | ''>('');
  
  const handleFilter = () => {
    const filtered = trackPoints.filter(point => {
      if (!point.elevation) return false;
      if (minElevation !== '' && point.elevation < minElevation) return false;
      if (maxElevation !== '' && point.elevation > maxElevation) return false;
      return true;
    });
    onFilter(filtered);
  };

  return (
    <div className="track-filter">
      <div className="filter-controls">
        <input
          type="number"
          placeholder="Min elevation"
          value={minElevation}
          onChange={(e) => setMinElevation(e.target.value ? Number(e.target.value) : '')}
        />
        <input
          type="number"
          placeholder="Max elevation"
          value={maxElevation}
          onChange={(e) => setMaxElevation(e.target.value ? Number(e.target.value) : '')}
        />
        <button onClick={handleFilter}>Apply Filter</button>
      </div>
    </div>
  );
};
