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
        
        <CreateGroupForm onSubmit={(data) => {
          onSubmit(data);          
        }} 
        onClose={onClose} />
      </div>
    </div>
  );
};
