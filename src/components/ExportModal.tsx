import React, { useState } from 'react';
import './ExportModal.css';
import { User } from "@junobuild/core";

interface ExportModalProps {
  onExport: (format: string, storage: 'local' | 'cloud', filename: string, description: string,eventId: string) => void;
  onClose: () => void;
  user: User | null;
  onLogin: () => void;
}
export const ExportModal = ({ onExport, onClose, user, onLogin }: ExportModalProps) => {
  const [format, setFormat] = useState('csv');
  const [storage, setStorage] = useState<'local' | 'cloud'>('local');
  const [filename, setFilename] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [eventId, setEventId] = useState("0");

  const handleExport = async () => {
    setIsLoading(true);
    await onExport(format, storage, filename, description, eventId);
    setIsLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Export Track</h3>
        {isLoading ? (
          <div className="spinner-container">
            <div className="spinner"></div>
            <p>Exporting track...</p>
          </div>
        ) : (
          <>
          <div className="option-group">
                <label>Event ID:</label>
                <input
                  type="text"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  placeholder="Enter event ID"
                  className="eventid-input"
                />
              </div>
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
                  <option disabled={!user} value="cloud">Cloud Storage{!user && ' (login required)'}</option>
                </select>
              </div>
            </div>
            <div className="modal-buttons">
              <button onClick={handleExport}>
                {storage === 'local' ? 'Download' : 'Upload'}
              </button>
              <button onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};