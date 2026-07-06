import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track, CheckPoint, RecordingSettings, PendingSyncItem } from '../types';

const TRACKS_KEY = '@alltracks_tracks';
const CHECKPOINTS_KEY = '@alltracks_checkpoints';
const SETTINGS_KEY = '@alltracks_settings';
const ACTIVE_TRACK_KEY = '@alltracks_active_track';
const PENDING_SYNC_KEY = '@alltracks_pending_sync';

export class StorageService {
  // Track operations
  static async saveTracks(tracks: Track[]): Promise<void> {
    try {
      await AsyncStorage.setItem(TRACKS_KEY, JSON.stringify(tracks));
    } catch (error) {
      console.error('Error saving tracks:', error);
      throw error;
    }
  }

  static async getTracks(): Promise<Track[]> {
    try {
      const tracks = await AsyncStorage.getItem(TRACKS_KEY);
      return tracks ? JSON.parse(tracks) : [];
    } catch (error) {
      console.error('Error loading tracks:', error);
      return [];
    }
  }

  static async saveTrack(track: Track): Promise<void> {
    try {
      const tracks = await this.getTracks();
      const index = tracks.findIndex((t) => t.id === track.id);
      if (index >= 0) {
        tracks[index] = track;
      } else {
        tracks.push(track);
      }
      await this.saveTracks(tracks);
    } catch (error) {
      console.error('Error saving track:', error);
      throw error;
    }
  }

  static async updateTrack(trackId: string, updates: Partial<Track>): Promise<Track | null> {
    try {
      const tracks = await this.getTracks();
      const index = tracks.findIndex((t) => t.id === trackId);
      if (index < 0) {
        return null;
      }

      tracks[index] = {
        ...tracks[index],
        ...updates,
      };
      await this.saveTracks(tracks);
      return tracks[index];
    } catch (error) {
      console.error('Error updating track:', error);
      throw error;
    }
  }

  static async deleteTrack(trackId: string): Promise<void> {
    try {
      const tracks = await this.getTracks();
      const filtered = tracks.filter((t) => t.id !== trackId);
      await this.saveTracks(filtered);
    } catch (error) {
      console.error('Error deleting track:', error);
      throw error;
    }
  }

  static async getTrackById(trackId: string): Promise<Track | null> {
    try {
      const tracks = await this.getTracks();
      return tracks.find((t) => t.id === trackId) || null;
    } catch (error) {
      console.error('Error getting track:', error);
      return null;
    }
  }

  // Active track operations
  static async setActiveTrack(track: Track | null): Promise<void> {
    try {
      if (track) {
        await AsyncStorage.setItem(ACTIVE_TRACK_KEY, JSON.stringify(track));
      } else {
        await AsyncStorage.removeItem(ACTIVE_TRACK_KEY);
      }
    } catch (error) {
      console.error('Error setting active track:', error);
      throw error;
    }
  }

  static async getActiveTrack(): Promise<Track | null> {
    try {
      const track = await AsyncStorage.getItem(ACTIVE_TRACK_KEY);
      return track ? JSON.parse(track) : null;
    } catch (error) {
      console.error('Error getting active track:', error);
      return null;
    }
  }

  // Checkpoint operations
  static async saveCheckpoints(checkpoints: CheckPoint[]): Promise<void> {
    try {
      await AsyncStorage.setItem(CHECKPOINTS_KEY, JSON.stringify(checkpoints));
    } catch (error) {
      console.error('Error saving checkpoints:', error);
      throw error;
    }
  }

  static async getCheckpoints(): Promise<CheckPoint[]> {
    try {
      const checkpoints = await AsyncStorage.getItem(CHECKPOINTS_KEY);
      return checkpoints ? JSON.parse(checkpoints) : [];
    } catch (error) {
      console.error('Error loading checkpoints:', error);
      return [];
    }
  }

  static async saveCheckpoint(checkpoint: CheckPoint): Promise<void> {
    try {
      const checkpoints = await this.getCheckpoints();
      checkpoints.push(checkpoint);
      await this.saveCheckpoints(checkpoints);
    } catch (error) {
      console.error('Error saving checkpoint:', error);
      throw error;
    }
  }

  static async updateCheckpoint(checkpointId: string, updates: Partial<CheckPoint>): Promise<CheckPoint | null> {
    try {
      const checkpoints = await this.getCheckpoints();
      const index = checkpoints.findIndex((cp) => cp.id === checkpointId);
      if (index < 0) {
        return null;
      }

      checkpoints[index] = {
        ...checkpoints[index],
        ...updates,
      };
      await this.saveCheckpoints(checkpoints);
      return checkpoints[index];
    } catch (error) {
      console.error('Error updating checkpoint:', error);
      throw error;
    }
  }

  static async getCheckpointById(checkpointId: string): Promise<CheckPoint | null> {
    try {
      const checkpoints = await this.getCheckpoints();
      return checkpoints.find((cp) => cp.id === checkpointId) || null;
    } catch (error) {
      console.error('Error getting checkpoint:', error);
      return null;
    }
  }

  static async getCheckpointsByTrackId(trackId: string): Promise<CheckPoint[]> {
    try {
      const checkpoints = await this.getCheckpoints();
      return checkpoints.filter((cp) => cp.trackId === trackId);
    } catch (error) {
      console.error('Error getting checkpoints:', error);
      return [];
    }
  }

  // Settings operations
  static async saveSettings(settings: RecordingSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  static async getSettings(): Promise<RecordingSettings> {
    try {
      const settings = await AsyncStorage.getItem(SETTINGS_KEY);
      return settings
        ? JSON.parse(settings)
        : {
            mode: 'auto' as const,
            minDistance: 10,
            minTime: 5,
            recordElevation: true,
          };
    } catch (error) {
      console.error('Error loading settings:', error);
      return {
        mode: 'auto' as const,
        minDistance: 10,
        minTime: 5,
        recordElevation: true,
      };
    }
  }

  static async savePendingSyncItems(items: PendingSyncItem[]): Promise<void> {
    try {
      await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving pending sync items:', error);
      throw error;
    }
  }

  static async getPendingSyncItems(): Promise<PendingSyncItem[]> {
    try {
      const items = await AsyncStorage.getItem(PENDING_SYNC_KEY);
      return items ? JSON.parse(items) : [];
    } catch (error) {
      console.error('Error loading pending sync items:', error);
      return [];
    }
  }

  static async enqueuePendingSyncItem(item: PendingSyncItem): Promise<void> {
    try {
      const items = await this.getPendingSyncItems();
      const exists = items.some((existing) => existing.type === item.type && existing.entityId === item.entityId);
      if (exists) {
        return;
      }

      items.push(item);
      await this.savePendingSyncItems(items);
    } catch (error) {
      console.error('Error enqueueing pending sync item:', error);
      throw error;
    }
  }

  static async updatePendingSyncItem(itemId: string, updates: Partial<PendingSyncItem>): Promise<void> {
    try {
      const items = await this.getPendingSyncItems();
      const updated = items.map((item) => (item.id === itemId ? { ...item, ...updates } : item));
      await this.savePendingSyncItems(updated);
    } catch (error) {
      console.error('Error updating pending sync item:', error);
      throw error;
    }
  }

  static async removePendingSyncItem(itemId: string): Promise<void> {
    try {
      const items = await this.getPendingSyncItems();
      await this.savePendingSyncItems(items.filter((item) => item.id !== itemId));
    } catch (error) {
      console.error('Error removing pending sync item:', error);
      throw error;
    }
  }

  // Clear all data
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        TRACKS_KEY,
        CHECKPOINTS_KEY,
        SETTINGS_KEY,
        ACTIVE_TRACK_KEY,
        PENDING_SYNC_KEY,
      ]);
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }
}
