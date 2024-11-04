import React from 'react';

interface MapControlsProps {
  autoCenter: boolean;
  showPoints: boolean;
  onToggleAutoCenter: () => void;
  onToggleShowPoints: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  autoCenter,
  showPoints,
  onToggleAutoCenter,
  onToggleShowPoints
}) => {
  return (
    <div className="leaflet-top leaflet-left custom-controls">
      <div className="leaflet-control leaflet-bar">
        <a
          href="#"
          className={`leaflet-control-button ${autoCenter ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            onToggleAutoCenter();
          }}
          title="Auto Center"
        >
          <span className="material-icons">my_location</span>
        </a>
        <a
          href="#"
          className={`leaflet-control-button ${showPoints ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault();
            onToggleShowPoints();
          }}
          title="Show Points"
        >
          <span className="material-icons">place</span>
        </a>
      </div>
    </div>
  );
};
