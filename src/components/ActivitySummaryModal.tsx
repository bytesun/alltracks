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
  onSaveAndFinish: () => void | Promise<void>;
  onMoreOptions: () => void;
  onShare: () => void | Promise<void>;
  onKeepRecording: () => void;
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
  onSaveAndFinish,
  onMoreOptions,
  onShare,
  onKeepRecording,
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
            <p className="activity-summary-eyebrow">Activity complete</p>
            <h2 id="activity-summary-title">{name}</h2>
            <p className="activity-summary-subtitle">
              <span>{activity}</span>
              {startTime ? <span>{new Date(startTime).toLocaleString()}</span> : null}
            </p>
          </div>
          <button
            type="button"
            className="activity-summary-close"
            onClick={onKeepRecording}
            aria-label="Close summary and keep recording"
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
          Save a GPX copy to this device to finish now, or open more options for KML, CSV, or cloud storage.
        </p>

        <div className="activity-summary-actions">
          <button
            type="button"
            className="activity-summary-primary"
            onClick={onSaveAndFinish}
            disabled={isSaving}
          >
            <span className="material-icons">download_done</span>
            {isSaving ? 'Saving…' : 'Save GPX & Finish'}
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
            onClick={onKeepRecording}
            disabled={isSaving}
          >
            Keep recording
          </button>
        </div>
      </section>
    </div>
  );
};
