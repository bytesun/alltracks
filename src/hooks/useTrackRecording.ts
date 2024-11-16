import { useState, useCallback } from 'react';

export const useTrackRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [pendingPoint, setPendingPoint] = useState<GeolocationPosition | null>(null);
  const [showCommentModal, setShowCommentModal] = useState(false);

  const recordPoint = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPendingPoint(position);
          setShowCommentModal(true);
        },
        (error) => console.error('Error getting location:', error),
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    }
  }, []);

  return {
    isRecording,
    pendingPoint,
    showCommentModal,
    setIsRecording,
    setPendingPoint,
    setShowCommentModal,
    recordPoint
  };
};
