export interface TrackPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  elevation?: number;
  comment?: string;
  photo?: string;
}

export type SyncStatus = 'local-only' | 'pending' | 'syncing' | 'synced' | 'failed';

export interface CheckPoint {
  id: string;
  elevation: number;
  groupId?: string;
  isPublic: boolean;
  latitude: number;
  longitude: number;
  note?: string;
  photo?: string;
  timestamp: number;
  trackId: string;
  syncStatus?: SyncStatus;
  syncedAt?: number;
  lastSyncError?: string;
}

export interface Track {
  id: string;
  name: string;
  description: string;
  startTime: string;
  endTime?: string;
  points: TrackPoint[];
  distance?: number;
  duration?: number;
  elevationGain?: number;
  isRecording: boolean;
  syncStatus?: SyncStatus;
  syncedAt?: number;
  lastSyncError?: string;
}

export interface RecordingSettings {
  mode: 'manual' | 'auto';
  minDistance: number; // meters
  minTime: number; // seconds
  recordElevation: boolean;
}

export interface PendingSyncItem {
  id: string;
  entityId: string;
  type: 'checkpoint' | 'track';
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export type ExportFormat = 'gpx' | 'kml' | 'csv';
