
import React from 'react';

interface TrackControlsProps {
  recordingMode: 'manual' | 'auto';
  trackingStatus: 'idle' | 'tracking' | 'paused';
  autoRecordingSettings: {
    minDistance: number;
    minTime: number;
  };
  onRecordPoint: () => void;
  onModeChange: (mode: 'manual' | 'auto') => void;
  onStartTracking: () => void;
  onPauseTracking: () => void;
  onResumeTracking: () => void;
  onStopTracking: () => void;
  onSettingsChange: (settings: { minDistance: number; minTime: number }) => void;
}

export const TrackControls: React.FC<TrackControlsProps> = ({
  recordingMode,
  trackingStatus,
  autoRecordingSettings,
  onRecordPoint,
  onModeChange,
  onStartTracking,
  onPauseTracking,
  onResumeTracking,
  onStopTracking,
  onSettingsChange,
}) => {
  return (
    <div>
      {trackingStatus === 'idle' && (
        <div className="recording-mode">
          <label>
            <input
              type="radio"
              value="manual"
              checked={recordingMode === 'manual'}
              onChange={() => onModeChange('manual')}
            />
            Manual
          </label>
          <label>
            <input
              type="radio"
              value="auto"
              checked={recordingMode === 'auto'}
              onChange={() => onModeChange('auto')}
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
