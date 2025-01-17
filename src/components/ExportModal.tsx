import React, { useState } from 'react';
import './ExportModal.css';
import { useGlobalContext } from './Store';
import { TrackType } from '../api/alltracks/backend.did';
interface ExportModalProps {
  onExport: (
    format: string,
    storage: 'local' | 'cloud',
    filename: string,
    description: string,
    eventId: string,
    isPrivateStorage: boolean,
    trackType: TrackType
  ) => void;
  onClose: () => void;
  trackId: string;
  groupId: string;
}
export const ExportModal: React.FC<ExportModalProps> = ({ onExport, onClose, trackId, groupId }) => {
  const { state: { isAuthed } } = useGlobalContext();
  const [format, setFormat] = useState('gpx');
  const [storage, setStorage] = useState<'local' | 'cloud'>('local');
  const [filename, setFilename] = useState(`${trackId}_${groupId}`);
  const [description, setDescription] = useState('');
  const [eventId, setEventId] = useState(trackId);
  const [trackType, setTrackType] = useState<TrackType>({'hike':null});

  // Add new state
  const [isPrivateStorage, setIsPrivateStorage] = useState(false);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Export Track</h3>
        <form onSubmit={(e) => {
          e.preventDefault();
          onExport(format, storage, filename, description, eventId, isPrivateStorage, trackType);
          onClose();
        }}>
          <button className="modal-close-btn" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
          {/* <div className="option-group">
            <label>Event ID:</label>
            <input
              type="text"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              placeholder="Enter event ID"
              className="eventid-input"
            />
          </div> */}
          <div className="export-options">
            <div className="option-group">
              <label>Filename:</label>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="Enter filename"
                className="filename-input"
              />
            </div>
            <div className="option-group">
              <label>Description:</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter track description"
                className="description-input"
                rows={3}
              />
            </div>
            <div className="option-group">
              <label>Track Type:</label>
              <select value={Object.keys(trackType)[0]} onChange={(e) => setTrackType({ [e.target.value]: null } as TrackType)}>
                <option value="hike">Hiking</option>
                <option value="bike">Biking</option>
                <option value="run">Running</option>
                <option value="drive">Roadtrip</option>
                <option value="travel">Travel</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="option-group">
              <label>Format:</label>
              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="csv">CSV</option>
                <option value="gpx">GPX</option>
                <option value="kml">KML</option>
              </select>
            </div>
            <div className="option-group">
              <label>Storage:</label>
              <select value={storage} onChange={(e) => setStorage(e.target.value as 'local' | 'cloud')}>
                <option value="local">Local Download</option>
                <option disabled={!isAuthed} value="cloud">Upload to Cloud{!isAuthed && ' (login required)'}</option>
              </select>
            </div>
          </div>
          {/* {storage === 'cloud' && isAuthed && (
            <div className="storage-options">
              <label>
                <input
                  type="checkbox"
                  checked={isPrivateStorage}
                  onChange={(e) => setIsPrivateStorage(e.target.checked)}
                />
                Use Private Storage
              </label>
            </div>
          )}
           */}
          <div className="modal-actions">
            <button type="submit">Export</button>
          </div>
        </form>
      </div>
    </div>
  );
};