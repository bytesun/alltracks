import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import "../styles/StartTrackModal.css";

interface StartTrackModalProps {
  onClose: () => void;
  onStart: (trackSetting:{
    trackId: string;
    recordingMode: 'manual' | 'auto';
    autoRecordingSettings: {
        minTime: number;
        minDistance: number;
    };
  }) => void;
}

export const StartTrackModal: React.FC<StartTrackModalProps> = ({
  onClose,
  onStart
}) => {
    const [trackId, setTrackId] = React.useState(()=>uuidv4());
    const [recordingMode, setRecordingMode] = React.useState<'manual' | 'auto'>('manual');
    const [autoRecordingSettings, setAutoRecordingSettings] = React.useState({
      minTime: 10,
      minDistance: 10,
    });

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Start New Track</h2>
        <div className="form-group">
          <label>Track ID</label>
          <input
            type="text"
            value={trackId}
            onChange={(e) => setTrackId(e.target.value)}
          />
        </div>
    
        <div className='controls'>
            <div className="recording-mode">
              <label>
                <input
                  type="radio"
                  value="manual"
                  checked={recordingMode === 'manual'}
                  onChange={() => {
                    setRecordingMode('manual');
                  }}
                />
                Manual
              </label>
              <label>
                <input
                  type="radio"
                  value="auto"
                  checked={recordingMode === 'auto'}
                  onChange={() => {
                    setRecordingMode('auto');
                  }}
                />
                Automatic
              </label>
            </div>
        
          {recordingMode === 'auto' && (
            <div className="auto-settings">
              <label>
                Min Distance (m):
                <input
                  type="number"
                  value={autoRecordingSettings.minDistance}
                  onChange={(e) => setAutoRecordingSettings(prev => ({
                    ...prev,
                    minDistance: Number(e.target.value)
                  }))}
                  min="1"
                />
              </label>
              <label>
                Min Time (s):
                <input
                  type="number"
                  value={autoRecordingSettings.minTime}
                  onChange={(e) => setAutoRecordingSettings(prev => ({
                    ...prev,
                    minTime: Number(e.target.value)
                  }))}
                  min="1"
                />
              </label>
            </div>
          )}
        </div>
        
        <div className="modal-buttons">
          <button onClick={()=>onStart({
            trackId,
            recordingMode,
            autoRecordingSettings

          })}>Start</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};
