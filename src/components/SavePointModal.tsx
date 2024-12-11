import React, { useState } from 'react';
import '../styles/SavePointModal.css';

interface SavePointModalProps {
  location: {
    latitude: number;
    longitude: number;
  };
  onSave: (data: { category: string; description: string }) => void;
  onClose: () => void;
}

export const SavePointModal: React.FC<SavePointModalProps> = ({ location, onSave, onClose }) => {
  const [category, setCategory] = useState('view');
  const [description, setDescription] = useState('');
  const categories = ['view', 'scenic', 'rest', 'water', 'camp', 'other'];

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Save Point</h3>
        <div className="location-display">
          <span>{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</span>
        </div>
        
        <div className="category-selector">
          {categories.map(cat => (
            <button 
              key={cat}
              className={`category-btn ${category === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              <span className="material-icons">
                {cat === 'view' && 'visibility'}
                {cat === 'scenic' && 'photo_camera'}
                {cat === 'rest' && 'chair'}
                {cat === 'water' && 'water_drop'}
                {cat === 'camp' && 'camping'}
                {cat === 'other' && 'place'}
              </span>
              {cat}
            </button>
          ))}
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a note..."
          rows={3}
        />

        <div className="modal-buttons">
          <button onClick={() => onSave({ category, description })}>Save</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};
