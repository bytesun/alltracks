import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { openDB } from 'idb';
import "../styles/StartTrackModal.css";
import Cookies from 'js-cookie';

interface StartTrackModalProps {
  onClose: () => void;
  onStart: (trackSetting: {
    trackId: string;
    groupId: string;
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
  const [trackId, setTrackId] = React.useState<string>(uuidv4());
  const [groupId, setGroupId] = React.useState<string>(Cookies.get('groupId') || '0');

  const [recordingMode, setRecordingMode] = React.useState<'manual' | 'auto'>('manual');
  const [existingTracks, setExistingTracks] = React.useState<{ id: string, timestamp: number }[]>([]);
  const [selectedTrack, setSelectedTrack] = React.useState<string>('');
  const [autoRecordingSettings, setAutoRecordingSettings] = React.useState({
    minTime: 10,
    minDistance: 10,
  });

  React.useEffect(() => {
    if (groupId) {
      Cookies.set('groupId', groupId);
    }
  }, [groupId]);

  React.useEffect(() => {
    const loadTracks = async () => {
      try {
        const db = await openDB('tracks-db', 1);
        const tracks = await db.getAll('tracks');

        setExistingTracks(tracks.map(track => ({
          id: track.id,
          timestamp: track.timestamp
        })));


      } catch (error) {
        // console.error("Error loading tracks:", error);

      };
    }
    loadTracks();
  }, []);


  const handleTrackSelection = (value: string) => {

    setSelectedTrack(value);
    if (value === 'new') {
      //do nothing
    } else {
      setTrackId(value);
    }

  };


  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Start Track</h2>
        <div className='id-settings'>
        {existingTracks.length > 0 && <div className="form-group">
          <select
            value={selectedTrack}
            onChange={(e) => handleTrackSelection(e.target.value)}
            className="track-select"
          >
            <option>-- select saved tracks --</option>
            <option value="new">Create New Track</option>
            {existingTracks.map(track => (
              <option key={track.id} value={track.id}>
                {track.id} - {new Date(track.timestamp).toLocaleString()}
              </option>
            ))}
          </select>
        </div>}
        {(selectedTrack === 'new' || existingTracks.length === 0) && (
          <div className="form-group">
            <label>Track ID</label>
            <input
              type="text"
              value={trackId}
              onChange={(e) => setTrackId(e.target.value)}
              
            />
          </div>
        )}
        <div className="form-group">
          <label>Group ID</label>
          <input
            type="text"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="group-id-input"
            placeholder="Enter group ID if sharing track"
          />
        </div>
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
              <div className="setting-field">
                <label>
                  Distance (m):
                  <input
                    type="number"
                    value={autoRecordingSettings.minDistance}
                    onChange={(e) => setAutoRecordingSettings(prev => ({
                      ...prev,
                      minDistance: Number(e.target.value)
                    }))}
                    min="1"
                    className="setting-input"
                  />
                </label>
              </div>
              <div className="setting-field">
                <label>
                  Time (s):
                  <input
                    type="number"
                    value={autoRecordingSettings.minTime}
                    onChange={(e) => setAutoRecordingSettings(prev => ({
                      ...prev,
                      minTime: Number(e.target.value)
                    }))}
                    min="1"
                    className="setting-input"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="modal-buttons">
          <button
            disabled={!trackId || !recordingMode || trackId === ''}
            onClick={() => onStart({
              trackId,
              groupId,  
              recordingMode,
              autoRecordingSettings

            })}>Start</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};