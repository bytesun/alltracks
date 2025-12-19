export interface TrackPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  elevation?: number;
  comment?: string;
  photo?: string;
}

export interface CheckPoint {
  elevation: number;
  groupId?: string;
  isPublic: boolean;
  latitude: number;
  longitude: number;
  note?: string;
  photo?: string;
  timestamp: number;
  trackId: string;
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
}

export interface RecordingSettings {
  mode: 'manual' | 'auto';
  minDistance: number; // meters
  minTime: number; // seconds
  recordElevation: boolean;
}

export type ExportFormat = 'gpx' | 'kml' | 'csv';
