import React from 'react';

interface ViewControlsProps {
  viewMode: 'map' | 'list';
  onViewChange: (mode: 'map' | 'list') => void;
}

export const ViewControls: React.FC<ViewControlsProps> = ({
  viewMode,
  onViewChange
}) => {
  return (
    <div className="view-controls">
      <button 
        className={`view-btn ${viewMode === 'map' ? 'active' : ''}`}
        onClick={() => onViewChange('map')}
      >
        <span className="material-icons">map</span>
        Map View
      </button>
      <button 
        className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
        onClick={() => onViewChange('list')}
      >
        <span className="material-icons">list</span>
        List View
      </button>
    </div>
  );
};
