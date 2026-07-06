import React, { useState } from 'react';
import '../styles/StatusRecordModal.css';

interface StatusRecordModalProps {
  location: {
    latitude: number;
    longitude: number;
  };
  onSave: (data: { description: string; tagsInput: string }) => void;
  onClose: () => void;
}

export const StatusRecordModal: React.FC<StatusRecordModalProps> = ({ location, onSave, onClose }) => {
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  return (
    <div className="modal-overlay">
      <div className="modal-content status-record-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Record Current Status</h3>
        <div className="location-display">
          <span>{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</span>
        </div>

        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="e.g. incident, weather, road, wildlife"
          className="status-record-tags-input"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is happening at your current location?"
          rows={4}
          className="status-record-textarea"
        />

        <div className="status-record-actions">
          <button type="button" className="status-record-save-btn" onClick={() => onSave({ description, tagsInput })}>
            Record status
          </button>
          <button type="button" className="status-record-cancel-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
