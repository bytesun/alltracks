import React, { useRef, useState } from 'react';
import { ActivityShareCard } from './ActivityShareCard';
import { TrackPoint } from '../types/TrackPoint';
import { shareActivityCard } from '../utils/shareActivityCard';
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
  points: TrackPoint[];
  isSaving?: boolean;
  onSaveGpx: () => void | Promise<void>;
  onMoreOptions: () => void;
  onClose: () => void;
}

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
  onClose,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [shareStatus, setShareStatus] = useState('');

  if (!isOpen) return null;

  const shareText = [
    name,
    `${distanceKm.toFixed(2)} km`,
    `${elevationGain.toFixed(0)} m gain`,
    pace !== '-' ? pace : null,
    'Recorded with AllTracks',
  ].filter(Boolean).join(' · ');

  const handleShare = async () => {
    setShareStatus('');
    setIsSharing(true);
    try {
      const result = await shareActivityCard(cardRef.current, name, shareText);
      setShareStatus(result === 'shared' ? 'Activity card shared.' : 'Activity card downloaded as PNG.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareStatus(error instanceof Error ? error.message : 'Unable to share the activity card.');
    } finally {
      setIsSharing(false);
    }
  };

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
            <h2 id="activity-summary-title">Your outdoor card is ready</h2>
            <p className="activity-summary-subtitle">
              <span>{points.length} recorded points</span>
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

        <div className="activity-summary-card-wrap">
          <ActivityShareCard
            ref={cardRef}
            name={name}
            activity={activity}
            startTime={startTime}
            distanceKm={distanceKm}
            movingHours={movingHours}
            elevationGain={elevationGain}
            pace={pace}
            points={points}
          />
        </div>

        <p className="activity-summary-hint">
          Share the card as an image, save the route as GPX, or open advanced export options for KML, CSV, and cloud storage.
        </p>

        {shareStatus && <div className="activity-summary-status" role="status">{shareStatus}</div>}

        <div className="activity-summary-actions">
          <button
            type="button"
            className="activity-summary-share"
            onClick={handleShare}
            disabled={isSaving || isSharing}
          >
            <span className="material-icons">ios_share</span>
            {isSharing ? 'Creating card…' : 'Share outdoor card'}
          </button>
          <button
            type="button"
            className="activity-summary-primary"
            onClick={onSaveGpx}
            disabled={isSaving || isSharing}
          >
            <span className="material-icons">download_done</span>
            {isSaving ? 'Saving…' : 'Save GPX'}
          </button>
          <button
            type="button"
            className="activity-summary-secondary"
            onClick={onMoreOptions}
            disabled={isSaving || isSharing}
          >
            <span className="material-icons">tune</span>
            More options
          </button>
          <button
            type="button"
            className="activity-summary-keep"
            onClick={onClose}
            disabled={isSaving || isSharing}
          >
            Back to track
          </button>
        </div>
      </section>
    </div>
  );
};
