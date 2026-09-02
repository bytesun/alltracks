import React from 'react';
import '../styles/ActivitySummaryModal.css';

interface ActivitySummaryModalProps {
  isOpen: boolean;
  name: string;
  activity: string;
  startTime?: number;
  distanceKm: number;
  movingHours: number;
  elevationGain: number;
  pace: string;
  points: number;
  isSaving?: boolean;
  onSaveGpx: () => void | Promise<void>;
  onMoreOptions: () => void;
  onShare: () => void | Promise<void>;
  onClose: () => void;
}

const formatDuration = (hours: number) => {
  if (!Number.isFinite(hours) || hours <= 0) return '0m';
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export const ActivitySummaryModal: React.FC<ActivitySummaryModalProps> = ({
  isOpen,
  name,
  activity,
  startTime,
  distanceKm,
  movingHours,
  elevationGain,
  pace,
  points,
  isSaving = false,
  onSaveGpx,
  onMoreOptions,
  onShare,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="activity-summary-overlay" role="presentation">
      <section
        className="activity-summary-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-summary-title"
      >
        <div className="activity-summary-topbar">
          <div>
            <p className="activity-summary-eyebrow">Activity summary</p>
            <h2 id="activity-summary-title">{name}</h2>
            <p className="activity-summary-subtitle">
              <span>{activity}</span>
              {startTime ? <span>{new Date(startTime).toLocaleString()}</span> : null}
            </p>
          </div>
          <button
            type="button"
            className="activity-summary-close"
            onClick={onClose}
            aria-label="Close activity summary"
          >
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="activity-summary-hero-stat">
          <strong>{distanceKm.toFixed(2)}</strong>
          <span>km</span>
        </div>

        <div className="activity-summary-stats" aria-label="Activity statistics">
          <div>
            <span>Moving time</span>
            <strong>{formatDuration(movingHours)}</strong>
          </div>
          <div>
            <span>Elevation gain</span>
            <strong>{elevationGain.toFixed(0)} m</strong>
          </div>
          <div>
            <span>Pace</span>
            <strong>{pace}</strong>
          </div>
          <div>
            <span>Recorded points</span>
            <strong>{points}</strong>
          </div>
        </div>

        <p className="activity-summary-hint">
          Save a GPX copy now, share a compact activity recap, or open more options for KML, CSV, and cloud storage.
        </p>

        <div className="activity-summary-actions">
          <button
            type="button"
            className="activity-summary-primary"
            onClick={onSaveGpx}
            disabled={isSaving}
          >
            <span className="material-icons">download_done</span>
            {isSaving ? 'Saving…' : 'Save GPX'}
          </button>
          <button
            type="button"
            className="activity-summary-secondary"
            onClick={onMoreOptions}
            disabled={isSaving}
          >
            <span className="material-icons">tune</span>
            More options
          </button>
          <button
            type="button"
            className="activity-summary-secondary"
            onClick={onShare}
            disabled={isSaving}
          >
            <span className="material-icons">share</span>
            Share summary
          </button>
          <button
            type="button"
            className="activity-summary-keep"
            onClick={onClose}
            disabled={isSaving}
          >
            Back to track
          </button>
        </div>
      </section>
    </div>
  );
};
