import { useState, useCallback } from 'react';

type NotificationType = 'success' | 'error' | 'info';

interface NotificationState {
  message: string;
  type: NotificationType;
  isVisible: boolean;
}

export const useNotification = () => {
  const [notification, setNotification] = useState<NotificationState>({
    message: '',
    type: 'info',
    isVisible: false
  });

  const showNotification = useCallback((message: string, type: NotificationType) => {
    setNotification({
      message,
      type,
      isVisible: true
    });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({
      ...prev,
      isVisible: false
    }));
  }, []);

  return {
    notification,
    showNotification,
    hideNotification
  };
};