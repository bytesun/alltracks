import { TrackPoint } from '../types/TrackPoint';

export interface ActivityMetrics {
  distanceKm: number;
  movingHours: number;
  elevationGain: number;
  pace: string;
  startTime?: number;
}

const distanceKmBetween = (a: TrackPoint, b: TrackPoint) => {
  const radiusKm = 6371;
  const dLat = (b.latitude - a.latitude) * Math.PI / 180;
  const dLon = (b.longitude - a.longitude) * Math.PI / 180;
  const lat1 = a.latitude * Math.PI / 180;
  const lat2 = b.latitude * Math.PI / 180;
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

export const formatDuration = (hours: number) => {
  if (!Number.isFinite(hours) || hours <= 0) return '0m';
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export const formatPace = (minutesPerKm: number) => {
  if (!Number.isFinite(minutesPerKm) || minutesPerKm <= 0) return '-';
  const totalSeconds = Math.round(minutesPerKm * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')} min/km`;
};

export const calculateActivityMetrics = (points: TrackPoint[], movementThresholdMeters = 5): ActivityMetrics => {
  let distanceKm = 0;
  let movingMs = 0;
  let elevationGain = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const segmentKm = distanceKmBetween(previous, current);
    distanceKm += segmentKm;

    if (segmentKm * 1000 > movementThresholdMeters) {
      movingMs += Math.max(0, current.timestamp - previous.timestamp);
    }

    const elevationDelta = (current.elevation ?? 0) - (previous.elevation ?? 0);
    if (elevationDelta > 0) elevationGain += elevationDelta;
  }

  const movingHours = movingMs / 3_600_000;
  const paceMinutes = distanceKm > 0 ? (movingMs / 60_000) / distanceKm : 0;

  return {
    distanceKm,
    movingHours,
    elevationGain,
    pace: formatPace(paceMinutes),
    startTime: points[0]?.timestamp,
  };
};
