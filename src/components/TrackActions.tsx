import React from 'react';

interface TrackActionsProps {
  onShare: () => void;
  onSave: () => void;
  onDelete: () => void;
  disabled?: boolean;
}

export const TrackActions: React.FC<TrackActionsProps> = ({
  onShare,
  onSave,
  onDelete,
  disabled = false
}) => {
  return (
    <div className="track-actions">
      <button 
        onClick={onShare} 
        disabled={disabled}
        className="action-button share"
      >
        <span className="material-icons">share</span>
        Share
      </button>
      <button 
        onClick={onSave} 
        disabled={disabled}
        className="action-button save"
      >
        <span className="material-icons">save</span>
        Save
      </button>
      <button 
        onClick={onDelete} 
        disabled={disabled}
        className="action-button delete"
      >
        <span className="material-icons">delete</span>
        Delete
      </button>
    </div>
  );
};
