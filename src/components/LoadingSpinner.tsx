import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium',
  message 
}) => {
  const sizeClass = `spinner-${size}`;
  
  return (
    <div className="spinner-container">
      <div className={`spinner ${sizeClass}`} />
      {message && <p className="spinner-message">{message}</p>}
    </div>
  );
};
