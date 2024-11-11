import React from 'react';
import '../styles/Notification.css';

interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Notification = ({ message, type, onClose }: NotificationProps) => {
  return (
    <div className={`notification ${type}`}>
      <div className="notification-content">
        <span className="material-icons">
          {type === 'success' ? 'check_circle' : 
           type === 'error' ? 'error' : 'info'}
        </span>
        <p>{message}</p>
      </div>
      <button className="notification-close" onClick={onClose}>
        <span className="material-icons">close</span>
      </button>
    </div>
  );
};