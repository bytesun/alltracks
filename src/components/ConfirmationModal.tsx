import React from 'react';

interface ConfirmationModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel'
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Confirm Action</h3>
        <p>{message}</p>
        <div className="modal-buttons">
          <button 
            onClick={onConfirm}
            className="confirm-button"
          >
            {confirmText}
          </button>
          <button 
            onClick={onCancel}
            className="cancel-button"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};
