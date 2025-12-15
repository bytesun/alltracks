import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track, CheckPoint, RecordingSettings } from '../types';

const TRACKS_KEY = '@alltracks_tracks';
const CHECKPOINTS_KEY = '@alltracks_checkpoints';
const SETTINGS_KEY = '@alltracks_settings';
const ACTIVE_TRACK_KEY = '@alltracks_active_track';

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

  // Clear all data
  static async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        TRACKS_KEY,
        CHECKPOINTS_KEY,
        SETTINGS_KEY,
        ACTIVE_TRACK_KEY,
      ]);
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }
}
