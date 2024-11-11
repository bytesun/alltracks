import React from 'react';
import "../styles/Spinner.css";

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export const Spinner = ({ size = 'medium', color = '#007bff' }: SpinnerProps) => {
  return (
    <div className={`spinner ${size}`}>
      <div className="spinner-circle" style={{ borderColor: color }}></div>
    </div>
  );
};
