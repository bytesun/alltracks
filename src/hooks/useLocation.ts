import { useState, useEffect } from 'react';

export const useLocation = () => {
  const [userLocation, setUserLocation] = useState<[number, number]>([49.2827, -123.1207]);
  const [locationError, setLocationError] = useState<string>('');

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setLocationError('');
      },
      (error) => {
        setLocationError(`Location error: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return { userLocation, locationError };
};
