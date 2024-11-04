import React from 'react';

interface StatusBarProps {
  trackingStatus: 'idle' | 'tracking' | 'paused';
  recordingMode: 'manual' | 'auto';
  pointCount: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  trackingStatus,
  recordingMode,
  pointCount
}) => {
  const getStatusColor = () => {
    switch (trackingStatus) {
      case 'tracking': return 'green';
      case 'paused': return 'orange';
      default: return 'gray';
    }
  };

  return (
    <div className="status-bar" style={{ backgroundColor: getStatusColor() }}>
      <div className="status-info">
        <span className="status-mode">{recordingMode.toUpperCase()}</span>
        <span className="status-state">{trackingStatus.toUpperCase()}</span>
        <span className="status-points">Points: {pointCount}</span>
      </div>
    </div>
  );
};
