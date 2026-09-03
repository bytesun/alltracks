import React, { useEffect, useState } from 'react';
import './ExportModal.css';
import { useGlobalContext } from './Store';
import { TrackType } from '../api/alltracks/backend.did';
import { TrackPoint } from '../types/TrackPoint';
import { calculateActivityMetrics } from '../utils/activityMetrics';
import {
  getTrackMetadataFromIndexDB,
  getTrackPointsFromIndexDB,
  saveCompletedActivityToIndexDB,
} from '../utils/IndexDBHandler';
import { ActivitySummaryModal } from './ActivitySummaryModal';

interface ExportModalProps {
  onExport: (
    format: string,
    storage: 'local' | 'cloud',
    filename: string,
    description: string,
    eventId: string,
    isPrivateStorage: boolean,
    trackType: TrackType
  ) => void | Promise<void>;
  onClose: () => void;
  trackId: string;
  groupId: string;
}

type ActivitySummary = ReturnType<typeof calculateActivityMetrics> & {
  name: string;
  activity: string;
  points: TrackPoint[];
};

const createSummary = (points: TrackPoint[], name: string, activity: string): ActivitySummary => ({
  name,
  activity,
  points,
  ...calculateActivityMetrics(points),
});

const toExportTrackType = (activity: string): TrackType => {
  switch (activity) {
    case 'running':
      return { run: null };
    case 'cycling':
      return { bike: null };
    case 'traveling':
      return { travel: null };
    case 'rowing':
    case 'sailing':
      return { paddle: null };
    default:
      return { hike: null };
  }
};

const safeFilename = (value: string) =>
  value
    .trim()
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'alltracks-activity';

export const ExportModal: React.FC<ExportModalProps> = ({ onExport, onClose, trackId, groupId }) => {
  const { state: { isAuthed } } = useGlobalContext();
  const [format, setFormat] = useState('gpx');
  const [storage, setStorage] = useState<'local' | 'cloud'>('local');
  const [filename, setFilename] = useState(`${trackId}_${groupId}`);
  const [description, setDescription] = useState('');
  const [eventId] = useState(trackId);
  const [trackType, setTrackType] = useState<TrackType>({ hike: null });
  const [isPrivateStorage] = useState(false);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;

    const loadSummary = async () => {
      setIsLoadingSummary(true);
      try {
        const stored = await getTrackPointsFromIndexDB(trackId);
        if (!active) return;

        const activity = stored.trackType || 'hiking';
        const name = stored.name || `AllTracks ${activity}`;
        setSummary(createSummary(stored.points, name, activity));
        setTrackType(toExportTrackType(activity));
        setFilename((current) => current === `${trackId}_${groupId}` ? safeFilename(name) : current);
      } catch (error) {
        console.error('Unable to prepare activity summary', error);
        if (active) {
          setLoadError('The activity summary could not be loaded, but export options are still available.');
          setShowOptions(true);
        }
      } finally {
        if (active) setIsLoadingSummary(false);
      }
    };

    loadSummary();
    return () => {
      active = false;
    };
  }, [trackId, groupId]);

  const runExport = async (
    nextFormat: string,
    nextStorage: 'local' | 'cloud',
    nextFilename: string,
    nextTrackType: TrackType,
  ) => {
    setIsSubmitting(true);
    try {
      await onExport(
        nextFormat,
        nextStorage,
        nextFilename,
        description,
        eventId,
        isPrivateStorage,
        nextTrackType,
      );

      // MainApp removes the active IndexedDB record only when the activity has
      // actually completed. A normal mid-activity Export keeps that record.
      // Checking it here lets History archive Finish without treating backups
      // (or swallowed export failures) as completed activities.
      if (nextStorage === 'local' && summary) {
        try {
          const activeTrack = await getTrackMetadataFromIndexDB(trackId);
          if (!activeTrack) {
            await saveCompletedActivityToIndexDB({
              id: trackId,
              name: summary.name,
              activity: summary.activity,
              groupId,
              completedAt: Date.now(),
              startTime: summary.startTime,
              distanceKm: summary.distanceKm,
              movingHours: summary.movingHours,
              elevationGain: summary.elevationGain,
              pace: summary.pace,
              points: summary.points,
            });
          }
        } catch (historyError) {
          console.error('Unable to save local activity history', historyError);
        }
      }

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showOptions && isLoadingSummary) {
    return (
      <div className="activity-summary-overlay" role="presentation">
        <section className="activity-summary-modal" role="dialog" aria-modal="true" aria-label="Preparing activity summary">
          <div className="activity-summary-topbar">
            <div>
              <p className="activity-summary-eyebrow">Activity summary</p>
              <h2>Preparing your activity…</h2>
              <p className="activity-summary-subtitle">Loading the latest recorded points.</p>
            </div>
            <button type="button" className="activity-summary-close" onClick={onClose} aria-label="Close activity summary">
              <span className="material-icons">close</span>
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!showOptions && summary) {
    return (
      <ActivitySummaryModal
        isOpen
        name={summary.name}
        activity={summary.activity}
        startTime={summary.startTime}
        distanceKm={summary.distanceKm}
        movingHours={summary.movingHours}
        elevationGain={summary.elevationGain}
        pace={summary.pace}
        points={summary.points}
        isSaving={isSubmitting}
        onSaveGpx={() => runExport('gpx', 'local', safeFilename(summary.name), trackType)}
        onMoreOptions={() => setShowOptions(true)}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Export Track</h3>
        {loadError && <div className="export-inline-message" role="status">{loadError}</div>}
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            await runExport(format, storage, filename, trackType);
          }}
        >
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close export">
            <span className="material-icons">close</span>
          </button>

          <div className="export-options">
            <div className="option-group">
              <label>Filename:</label>
              <input
                type="text"
                value={filename}
                onChange={(event) => setFilename(event.target.value)}
                placeholder="Enter filename"
                className="filename-input"
              />
            </div>
            <div className="option-group">
              <label>Description:</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Enter track description"
                className="description-input"
                rows={3}
              />
            </div>
            <div className="option-group">
              <label>Track Type:</label>
              <select
                value={Object.keys(trackType)[0]}
                onChange={(event) => setTrackType({ [event.target.value]: null } as TrackType)}
              >
                <option value="hike">Hiking</option>
                <option value="bike">Biking</option>
                <option value="run">Running</option>
                <option value="paddle">Paddling / Rowing</option>
                <option value="drive">Roadtrip</option>
                <option value="travel">Travel</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="option-group">
              <label>Format:</label>
              <select value={format} onChange={(event) => setFormat(event.target.value)}>
                <option value="csv">CSV</option>
                <option value="gpx">GPX</option>
                <option value="kml">KML</option>
              </select>
            </div>
            <div className="option-group">
              <label>Storage:</label>
              <select
                value={storage}
                onChange={(event) => setStorage(event.target.value as 'local' | 'cloud')}
              >
                <option value="local">Local Download</option>
                <option disabled={!isAuthed} value="cloud">
                  Upload to Cloud{!isAuthed && ' (login required)'}
                </option>
              </select>
            </div>
          </div>

          <div className="modal-actions">
            {summary && (
              <button type="button" onClick={() => setShowOptions(false)} disabled={isSubmitting}>
                Back to Summary
              </button>
            )}
            <button type="submit" disabled={isSubmitting || !filename.trim()}>
              {isSubmitting ? 'Exporting…' : 'Export'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
