import React, { useState } from 'react';
import "../App.css";
type TrackingStatus = 'idle' | 'tracking' | 'paused';
type RecordingMode = 'manual' | 'auto';

export interface TrackControlsProps {
  isTracking: boolean;
  onStartTracking: () => void;
  onStopTracking: () => void;
  onExport: () => void;
  onShowPoints: () => void;
  onAddComment: () => void;
  onRecordPoint: () => void;
  onPauseTracking: () => void;
  onResumeTracking: () => void;
}

export const TrackControls: React.FC<TrackControlsProps> = ({
  isTracking,
  onStartTracking,
  onStopTracking,
  onExport,
  onShowPoints,
  onAddComment,
  onRecordPoint,
  onPauseTracking,
  onResumeTracking
}) => {
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('manual');
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>('idle');

  const handleModeChange = (mode: RecordingMode) => {
    setRecordingMode(mode);
  };

  
 
  return (
    <div className="track-controls">
      {trackingStatus === 'idle' && (
        <div className="recording-mode">
          <label>
            <input
              type="radio"
              value="manual"
              checked={recordingMode === 'manual'}
              onChange={() => handleModeChange('manual')}
            />
            Manual
          </label>
          <label>
            <input
              type="radio"
              value="auto"
              checked={recordingMode === 'auto'}
              onChange={() => handleModeChange('auto')}
            />
            Automatic
          </label>
        </div>
      )}

      {recordingMode === 'manual' ? (
        <button onClick={onRecordPoint}>Record Point</button>
      ) : (
        <div className="auto-controls">
          {trackingStatus === 'idle' && (
            <button onClick={onStartTracking}>Start</button>
          )}
          {trackingStatus === 'tracking' && (
            <button onClick={onPauseTracking}>Pause</button>
          )}
          {trackingStatus === 'paused' && (
            <button onClick={onResumeTracking}>Resume</button>
          )}
          {(trackingStatus === 'tracking' || trackingStatus === 'paused') && (
            <button onClick={onStopTracking}>Stop</button>
          )}
        </div>
      )}
    </div>
  );
};
