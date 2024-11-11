import React from 'react';
import { CreateGroupForm } from './CreateGroupForm';
import '../styles/Group.css';

interface GroupFormData {
  name: string;
  description: string;
  calendarId: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: GroupFormData) => void;
}

export const CreateGroupModal = ({ isOpen, onClose, onSubmit }: ModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create New Group</h2>
          <button className="close-button" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>
        <CreateGroupForm onSubmit={(data) => {
          onSubmit(data);
          onClose();
        }} />
      </div>
    </div>
  );
};
