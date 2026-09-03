import { TrackPoint } from './TrackPoint';

export interface CompletedActivity {
  id: string;
  name: string;
  activity: string;
  groupId?: string;
  completedAt: number;
  startTime?: number;
  distanceKm: number;
  movingHours: number;
  elevationGain: number;
  pace: string;
  points: TrackPoint[];
}
