import React from 'react';

interface LocationErrorHandlerProps {
  error: string;
}

export const LocationErrorHandler: React.FC<LocationErrorHandlerProps> = ({ error }) => {
  if (!error) return null;
  
  return (
    <div className="location-error">
      <span className="material-icons">error_outline</span>
      {error}
    </div>
  );
};
