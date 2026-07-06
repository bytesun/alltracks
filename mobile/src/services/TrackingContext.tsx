import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { Track, TrackPoint, CheckPoint, RecordingSettings } from '../types';
import { LocationService } from './LocationService';
import { StorageService } from './StorageService';
import { AllTracksSyncService } from './AllTracksSyncService';

interface TrackingContextType {
  activeTrack: Track | null;
  tracks: Track[];
  checkpoints: CheckPoint[];
  settings: RecordingSettings;
  isTracking: boolean;
  isPaused: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  pendingSyncCount: number;
  lastSyncError: string | null;
  getActiveDuration: () => number;
  startTracking: (trackName: string, description?: string) => Promise<void>;
  stopTracking: () => Promise<void>;
  pauseTracking: () => void;
  resumeTracking: () => void;
  addCheckpoint: (note?: string, photo?: string) => Promise<void>;
  syncPendingData: () => Promise<void>;
  importTrack: (track: Track) => Promise<void>;
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
  const [isPaused, setIsPaused] = useState(false);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);
  const [totalPausedDuration, setTotalPausedDuration] = useState(0);
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const syncInFlightRef = useRef(false);

  useEffect(() => {
    loadData();
  }, []);

  const refreshPendingSyncCount = useCallback(async () => {
    const pendingItems = await StorageService.getPendingSyncItems();
    setPendingSyncCount(pendingItems.length);
  }, []);

  const syncPendingData = useCallback(async () => {
    if (syncInFlightRef.current) {
      return;
    }

    syncInFlightRef.current = true;
    try {
      const online = await AllTracksSyncService.isBackendReachable();
      setIsOnline(online);

      if (!online) {
        return;
      }

      const pendingItems = await StorageService.getPendingSyncItems();
      setPendingSyncCount(pendingItems.length);

      if (pendingItems.length === 0) {
        setLastSyncError(null);
        return;
      }

      setIsSyncing(true);

      for (const item of pendingItems) {
        try {
          if (item.type === 'checkpoint') {
            const checkpoint = await StorageService.getCheckpointById(item.entityId);
            if (!checkpoint) {
              await StorageService.removePendingSyncItem(item.id);
              continue;
            }

            await StorageService.updateCheckpoint(checkpoint.id, {
              syncStatus: 'syncing',
              lastSyncError: undefined,
            });
            setCheckpoints((prev) =>
              prev.map((cp) => (cp.id === checkpoint.id ? { ...cp, syncStatus: 'syncing', lastSyncError: undefined } : cp))
            );

            await AllTracksSyncService.syncCheckpoint(checkpoint);

            const syncedCheckpoint = await StorageService.updateCheckpoint(checkpoint.id, {
              syncStatus: 'synced',
              syncedAt: Date.now(),
              lastSyncError: undefined,
            });
            if (syncedCheckpoint) {
              setCheckpoints((prev) => prev.map((cp) => (cp.id === checkpoint.id ? syncedCheckpoint : cp)));
            }
          } else {
            const track = await StorageService.getTrackById(item.entityId);
            if (!track) {
              await StorageService.removePendingSyncItem(item.id);
              continue;
            }

            await StorageService.updateTrack(track.id, {
              syncStatus: 'syncing',
              lastSyncError: undefined,
            });
            setTracks((prev) =>
              prev.map((storedTrack) =>
                storedTrack.id === track.id ? { ...storedTrack, syncStatus: 'syncing', lastSyncError: undefined } : storedTrack
              )
            );

            await AllTracksSyncService.syncTrack(track);

            const syncedTrack = await StorageService.updateTrack(track.id, {
              syncStatus: 'synced',
              syncedAt: Date.now(),
              lastSyncError: undefined,
            });
            if (syncedTrack) {
              setTracks((prev) => prev.map((storedTrack) => (storedTrack.id === track.id ? syncedTrack : storedTrack)));
            }
          }

          await StorageService.removePendingSyncItem(item.id);
          setLastSyncError(null);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown sync error';
          setLastSyncError(message);

          if (item.type === 'checkpoint') {
            await StorageService.updateCheckpoint(item.entityId, {
              syncStatus: 'failed',
              lastSyncError: message,
            });
            setCheckpoints((prev) =>
              prev.map((cp) => (cp.id === item.entityId ? { ...cp, syncStatus: 'failed', lastSyncError: message } : cp))
            );
          } else {
            await StorageService.updateTrack(item.entityId, {
              syncStatus: 'failed',
              lastSyncError: message,
            });
            setTracks((prev) =>
              prev.map((track) => (track.id === item.entityId ? { ...track, syncStatus: 'failed', lastSyncError: message } : track))
            );
          }

          await StorageService.updatePendingSyncItem(item.id, {
            attempts: item.attempts + 1,
            lastError: message,
          });
        }
      }

      await refreshPendingSyncCount();
    } finally {
      setIsSyncing(false);
      syncInFlightRef.current = false;
    }
  }, [refreshPendingSyncCount]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncPendingData();
      }
    });

    const intervalId = setInterval(() => {
      syncPendingData();
    }, 30000);

    return () => {
      subscription.remove();
      clearInterval(intervalId);
    };
  }, [syncPendingData]);

  const loadData = async () => {
    try {
      const [storedTracks, storedCheckpoints, storedSettings, storedActiveTrack, pendingItems] = await Promise.all([
        StorageService.getTracks(),
        StorageService.getCheckpoints(),
        StorageService.getSettings(),
        StorageService.getActiveTrack(),
        StorageService.getPendingSyncItems(),
      ]);
      setTracks(storedTracks);
      setCheckpoints(storedCheckpoints);
      setSettings(storedSettings);
      setPendingSyncCount(pendingItems.length);
      if (storedActiveTrack && storedActiveTrack.isRecording) {
        setActiveTrack(storedActiveTrack);
        setIsTracking(true);
      }

      syncPendingData();
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
          syncStatus: 'local-only',
        };

        setActiveTrack(newTrack);
        setIsTracking(true);
        setIsPaused(false);
        setPauseStartTime(null);
        setTotalPausedDuration(0);
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

  const getActiveDuration = useCallback(() => {
    if (!activeTrack) return 0;
    
    const elapsedTime = Date.now() - new Date(activeTrack.startTime).getTime();
    let pausedTime = totalPausedDuration;
    
    // If currently paused, add the current pause duration
    if (isPaused && pauseStartTime) {
      pausedTime += Date.now() - pauseStartTime;
    }
    
    return elapsedTime - pausedTime;
  }, [activeTrack, isPaused, pauseStartTime, totalPausedDuration]);

  const pauseTracking = useCallback(() => {
    if (!isTracking || isPaused) return;
    setIsPaused(true);
    setPauseStartTime(Date.now());
    LocationService.stopTracking();
  }, [isTracking, isPaused]);

  const resumeTracking = useCallback(() => {
    if (!isTracking || !isPaused) return;
    
    // Calculate total paused duration
    if (pauseStartTime) {
      const pauseDuration = Date.now() - pauseStartTime;
      setTotalPausedDuration((prev) => prev + pauseDuration);
    }
    
    setIsPaused(false);
    setPauseStartTime(null);
    
    // Resume location tracking in auto mode
    if (settings.mode === 'auto') {
      LocationService.startTracking(
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
  }, [isTracking, isPaused, pauseStartTime, settings]);

  const stopTracking = useCallback(async () => {
    try {
      if (!activeTrack) return;

      // Update state immediately to reflect UI change
      setIsTracking(false);
      setIsPaused(false);
      
      LocationService.stopTracking();

      const endTime = new Date();
      
      // Calculate actual duration excluding paused time
      let actualDuration = endTime.getTime() - new Date(activeTrack.startTime).getTime();
      if (pauseStartTime) {
        // If currently paused, add the current pause duration
        actualDuration -= (endTime.getTime() - pauseStartTime) + totalPausedDuration;
      } else {
        actualDuration -= totalPausedDuration;
      }
      
      const finalTrack: Track = {
        ...activeTrack,
        endTime: endTime.toISOString(),
        isRecording: false,
        duration: activeTrack.points.length > 0 ? actualDuration : 0,
        syncStatus: activeTrack.points.length > 0 ? 'pending' : 'local-only',
        lastSyncError: undefined,
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
      if (finalTrack.points.length > 0) {
        await StorageService.enqueuePendingSyncItem({
          id: `track:${finalTrack.id}`,
          entityId: finalTrack.id,
          type: 'track',
          createdAt: Date.now(),
          attempts: 0,
        });
      }
      await StorageService.setActiveTrack(null);
      setTracks((prev) => [...prev, finalTrack]);
      setActiveTrack(null);
      setIsTracking(false);
      setPauseStartTime(null);
      setTotalPausedDuration(0);
      await refreshPendingSyncCount();
      await syncPendingData();
    } catch (error) {
      console.error('Error stopping tracking:', error);
      throw error;
    }
  }, [activeTrack, settings, pauseStartTime, totalPausedDuration, refreshPendingSyncCount, syncPendingData]);

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
          id: `${activeTrack.id}:${location.timestamp}`,
          latitude: location.latitude,
          longitude: location.longitude,
          elevation: location.elevation || 0,
          timestamp: location.timestamp,
          trackId: activeTrack.id,
          note,
          photo,
          isPublic: false,
          syncStatus: 'pending',
        };

        await StorageService.saveCheckpoint(checkpoint);
        await StorageService.enqueuePendingSyncItem({
          id: `checkpoint:${checkpoint.id}`,
          entityId: checkpoint.id,
          type: 'checkpoint',
          createdAt: Date.now(),
          attempts: 0,
        });
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

        await refreshPendingSyncCount();
        await syncPendingData();
      } catch (error) {
        console.error('Error adding checkpoint:', error);
        throw error;
      }
    },
    [activeTrack, settings, refreshPendingSyncCount, syncPendingData]
  );

  const loadTracks = useCallback(async () => {
    try {
      const storedTracks = await StorageService.getTracks();
      setTracks(storedTracks);
    } catch (error) {
      console.error('Error loading tracks:', error);
    }
  }, []);

  const importTrack = useCallback(async (track: Track) => {
    try {
      await StorageService.saveTrack(track);
      setTracks((prev) => [...prev, track]);
    } catch (error) {
      console.error('Error importing track:', error);
      throw error;
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
        isPaused,
        isOnline,
        isSyncing,
        pendingSyncCount,
        lastSyncError,
        getActiveDuration,
        startTracking,
        stopTracking,
        pauseTracking,
        resumeTracking,
        addCheckpoint,
        syncPendingData,
        importTrack,
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
