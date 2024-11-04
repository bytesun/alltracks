import { useState, useCallback } from 'react';

export const useMapControls = () => {
  const [autoCenter, setAutoCenter] = useState(false);
  const [showPoints, setShowPoints] = useState(false);

  const toggleAutoCenter = useCallback(() => {
    setAutoCenter(prev => !prev);
  }, []);

  const toggleShowPoints = useCallback(() => {
    setShowPoints(prev => !prev);
  }, []);

  return {
    autoCenter,
    showPoints,
    toggleAutoCenter,
    toggleShowPoints
  };
};
