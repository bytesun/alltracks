import React, { useState } from 'react';
import './ExportModal.css';
import { User } from "@junobuild/core";

interface ExportModalProps {
  onExport: (format: string, storage: 'local' | 'cloud') => void;
  onClose: () => void;
  user: User | null;
  onLogin: () => void;
}

export const ExportModal = ({ onExport, onClose, user, onLogin }: ExportModalProps) => {
  const [format, setFormat] = useState('csv');
  const [storage, setStorage] = useState<'local' | 'cloud'>('local');

  const handleExport = async () => {
  
    onExport(format, storage);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Export Track</h3>
        <div className="export-options">
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
              <option disabled={!user} value="cloud">Cloud Storage</option>
            </select>
          </div>
        </div>
        <div className="modal-buttons">
          <button onClick={handleExport}>
            {storage === 'local' ? 'Download' : 'Upload'}
          </button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};