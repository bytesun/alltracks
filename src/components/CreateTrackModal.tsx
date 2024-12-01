import React, { useState } from 'react';
import { useAlltracks } from './Store';

interface CreateTrackModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateTrackModal: React.FC<CreateTrackModalProps> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const alltracks = useAlltracks();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await alltracks.createTrack({
      name,
      description,
      timestamp: BigInt(Date.now() * 1000000)
    });
    onSuccess();
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Create New Track</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">Create</button>
          </div>
        </form>
      </div>
      
    </div>
  );
};
