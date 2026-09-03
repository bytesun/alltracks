import React, { forwardRef, useMemo } from 'react';
import { TrackPoint } from '../types/TrackPoint';
import { formatDuration } from '../utils/activityMetrics';
import '../styles/ActivityShareCard.css';

interface ActivityShareCardProps {
  name: string;
  activity: string;
  startTime?: number;
  distanceKm: number;
  movingHours: number;
  elevationGain: number;
  pace: string;
  points?: TrackPoint[];
  sourceLabel?: string;
}

const routePath = (points: TrackPoint[]) => {
  if (points.length < 2) return '';

  const width = 320;
  const height = 176;
  const padding = 18;
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latRange = Math.max(maxLat - minLat, 0.000001);
  const lngRange = Math.max(maxLng - minLng, 0.000001);

  return points.map((point, index) => {
    const x = padding + ((point.longitude - minLng) / lngRange) * (width - padding * 2);
    const y = height - padding - ((point.latitude - minLat) / latRange) * (height - padding * 2);
    return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
};

const activityLabel = (activity: string) => {
  const normalized = activity.trim().replace(/[-_]/g, ' ');
  if (!normalized) return 'Outdoor activity';
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

export const ActivityShareCard = forwardRef<HTMLDivElement, ActivityShareCardProps>(({
  name,
  activity,
  startTime,
  distanceKm,
  movingHours,
  elevationGain,
  pace,
  points = [],
  sourceLabel = 'Recorded with AllTracks',
}, ref) => {
  const path = useMemo(() => routePath(points), [points]);
  const dateLabel = startTime
    ? new Date(startTime).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Outdoor log';

  return (
    <div className="activity-share-card" ref={ref}>
      <div className="activity-card-brand-row">
        <div className="activity-card-brand">
          <span className="activity-card-mark" aria-hidden="true">A</span>
          <span>ALLTRACKS</span>
        </div>
        <span className="activity-card-date">{dateLabel}</span>
      </div>

      <div className="activity-card-heading">
        <p>{activityLabel(activity)}</p>
        <h3>{name}</h3>
      </div>

      <div className="activity-card-distance">
        <strong>{distanceKm.toFixed(2)}</strong>
        <span>KM</span>
      </div>

      <div className="activity-card-route" aria-label={`${points.length} recorded route points`}>
        {path ? (
          <svg viewBox="0 0 320 176" role="img" aria-label="Activity route silhouette">
            <path className="activity-card-route-glow" d={path} />
            <path className="activity-card-route-line" d={path} />
          </svg>
        ) : (
          <div className="activity-card-route-empty">
            <span className="material-icons">route</span>
            <span>Route preview</span>
          </div>
        )}
      </div>

      <div className="activity-card-stats">
        <div>
          <span>Moving</span>
          <strong>{formatDuration(movingHours)}</strong>
        </div>
        <div>
          <span>Elevation</span>
          <strong>{elevationGain.toFixed(0)} m</strong>
        </div>
        <div>
          <span>Pace</span>
          <strong>{pace}</strong>
        </div>
      </div>

      <div className="activity-card-footer">
        <span>{sourceLabel}</span>
        <span>Move · Notice · Remember</span>
      </div>
    </div>
  );
});

ActivityShareCard.displayName = 'ActivityShareCard';
