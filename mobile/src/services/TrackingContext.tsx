import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Track, TrackPoint, CheckPoint, RecordingSettings } from '../types';
import { LocationService } from './LocationService';
import { StorageService } from './StorageService';

interface TrackingContextType {
  activeTrack: Track | null;
  tracks: Track[];
  checkpoints: CheckPoint[];
  settings: RecordingSettings;
  isTracking: boolean;
  startTracking: (trackName: string, description?: string) => Promise<void>;
  stopTracking: () => Promise<void>;
  addCheckpoint: (note?: string, photo?: string) => Promise<void>;
  loadTracks: () => Promise<void>;
  deleteTrack: (trackId: string) => Promise<void>;
  updateSettings: (settings: RecordingSettings) => Promise<void>;
}

const TrackingContext = createContext<TrackingContextType | undefined>(undefined);

export const TrackingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTrack, setActiveTrack] = useState<Track | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [checkpoints, setCheckpoints] = useState<CheckPoint[]>([]);
  const [settings, setSettings] = useState<RecordingSettings>({
    mode: 'auto',
    minDistance: 10,
    minTime: 5,
    recordElevation: true,
  });
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [storedTracks, storedCheckpoints, storedSettings, storedActiveTrack] = await Promise.all([
        StorageService.getTracks(),
        StorageService.getCheckpoints(),
        StorageService.getSettings(),
        StorageService.getActiveTrack(),
      ]);
      setTracks(storedTracks);
      setCheckpoints(storedCheckpoints);
      setSettings(storedSettings);
      if (storedActiveTrack && storedActiveTrack.isRecording) {
        setActiveTrack(storedActiveTrack);
        setIsTracking(true);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const startTracking = useCallback(
    async (trackName: string, description: string = '') => {
      try {
        const newTrack: Track = {
          id: Date.now().toString(),
          name: trackName,
          description,
          startTime: new Date().toISOString(),
          points: [],
          isRecording: true,
        };

        setActiveTrack(newTrack);
        setIsTracking(true);
        await StorageService.setActiveTrack(newTrack);

        if (settings.mode === 'auto') {
          await LocationService.startTracking(
            async (point) => {
              setActiveTrack((prev) => {
                if (!prev) return null;
                const updatedTrack = {
                  ...prev,
                  points: [...prev.points, point],
                };
                StorageService.setActiveTrack(updatedTrack);
                return updatedTrack;
              });
            },
            {
              distanceInterval: settings.minDistance,
              timeInterval: settings.minTime * 1000,
            }
          );
        }
      } catch (error) {
        console.error('Error starting tracking:', error);
        throw error;
      }
    },
    [settings]
  );

  const stopTracking = useCallback(async () => {
    try {
      if (!activeTrack) return;

      // Update state immediately to reflect UI change
      setIsTracking(false);
      
      LocationService.stopTracking();

      const endTime = new Date();
      const finalTrack: Track = {
        ...activeTrack,
        endTime: endTime.toISOString(),
        isRecording: false,
        duration: activeTrack.points.length > 0
          ? endTime.getTime() - new Date(activeTrack.startTime).getTime()
          : 0,
      };

      // Calculate distance
      let totalDistance = 0;
      for (let i = 1; i < finalTrack.points.length; i++) {
        totalDistance += LocationService.calculateDistance(
          finalTrack.points[i - 1],
          finalTrack.points[i]
        );
      }
      finalTrack.distance = totalDistance;

      // Calculate elevation gain
      if (settings.recordElevation) {
        let elevationGain = 0;
        for (let i = 1; i < finalTrack.points.length; i++) {
          const prev = finalTrack.points[i - 1].elevation || 0;
          const curr = finalTrack.points[i].elevation || 0;
          if (curr > prev) {
            elevationGain += curr - prev;
          }
        }
        finalTrack.elevationGain = elevationGain;
      }

      await StorageService.saveTrack(finalTrack);
      await StorageService.setActiveTrack(null);
      setTracks((prev) => [...prev, finalTrack]);
      setActiveTrack(null);
      setIsTracking(false);
    } catch (error) {
      console.error('Error stopping tracking:', error);
      throw error;
    }
  }, [activeTrack, settings]);

  const addCheckpoint = useCallback(
    async (note?: string, photo?: string) => {
      try {
        if (!activeTrack) {
          throw new Error('No active track');
        }

        const location = await LocationService.getCurrentLocation();
        if (!location) {
          throw new Error('Could not get current location');
        }

        const checkpoint: CheckPoint = {
          latitude: location.latitude,
          longitude: location.longitude,
          elevation: location.elevation || 0,
          timestamp: location.timestamp,
          trackId: activeTrack.id,
          note,
          photo,
          isPublic: false,
        };

        await StorageService.saveCheckpoint(checkpoint);
        setCheckpoints((prev) => [...prev, checkpoint]);

        // If in manual mode, also add to track points
        if (settings.mode === 'manual') {
          const trackPoint: TrackPoint = {
            latitude: location.latitude,
            longitude: location.longitude,
            elevation: location.elevation,
            timestamp: location.timestamp,
            comment: note,
            photo,
          };

          setActiveTrack((prev) => {
            if (!prev) return null;
            const updatedTrack = {
              ...prev,
              points: [...prev.points, trackPoint],
            };
            StorageService.setActiveTrack(updatedTrack);
            return updatedTrack;
          });
        }
      } catch (error) {
        console.error('Error adding checkpoint:', error);
        throw error;
      }
    },
    [activeTrack, settings]
  );

  const loadTracks = useCallback(async () => {
    try {
      const storedTracks = await StorageService.getTracks();
      setTracks(storedTracks);
    } catch (error) {
      console.error('Error loading tracks:', error);
    }
  }, []);

  const deleteTrack = useCallback(async (trackId: string) => {
    try {
      await StorageService.deleteTrack(trackId);
      setTracks((prev) => prev.filter((t) => t.id !== trackId));
    } catch (error) {
      console.error('Error deleting track:', error);
      throw error;
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: RecordingSettings) => {
    try {
      await StorageService.saveSettings(newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }, []);

  return (
    <TrackingContext.Provider
      value={{
        activeTrack,
        tracks,
        checkpoints,
        settings,
        isTracking,
        startTracking,
        stopTracking,
        addCheckpoint,
        loadTracks,
        deleteTrack,
        updateSettings,
      }}
    >
      {children}
    </TrackingContext.Provider>
  );
};

export const useTracking = () => {
  const context = useContext(TrackingContext);
  if (context === undefined) {
    throw new Error('useTracking must be used within a TrackingProvider');
  }
  return context;
};
