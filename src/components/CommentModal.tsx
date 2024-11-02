import React, { useState } from 'react';
import './CommentModal.css';

interface CommentModalProps {
  onSave: (comment: string) => void;
  onClose: () => void;
}

export const CommentModal: React.FC<CommentModalProps> = ({ onSave, onClose }) => {
  const [comment, setComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(comment);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Add Point Comment</h3>
        <form onSubmit={handleSubmit}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Enter your comment (optional)"
            rows={4}
          />
          <div className="modal-buttons">
            <button type="submit">Save</button>
            <button type="button" onClick={onClose}>Skip</button>
          </div>
        </form>
      </div>
    </div>
  );
};
