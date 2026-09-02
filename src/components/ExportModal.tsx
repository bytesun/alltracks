import React, { useEffect, useMemo, useState } from 'react';
import './ExportModal.css';
import { useGlobalContext } from './Store';
import { TrackType } from '../api/alltracks/backend.did';
import { TrackPoint } from '../types/TrackPoint';
import { getTrackPointsFromIndexDB } from '../utils/IndexDBHandler';
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

type ActivitySummary = {
  name: string;
  activity: string;
  points: TrackPoint[];
  distanceKm: number;
  movingHours: number;
  elevationGain: number;
  pace: string;
  startTime?: number;
};

const calculateDistanceKm = (a: TrackPoint, b: TrackPoint) => {
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

const createSummary = (points: TrackPoint[], name: string, activity: string): ActivitySummary => {
  let distanceKm = 0;
  let movingMs = 0;
  let elevationGain = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const segmentKm = calculateDistanceKm(previous, current);
    distanceKm += segmentKm;

    if (segmentKm * 1000 > 5) {
      movingMs += Math.max(0, current.timestamp - previous.timestamp);
    }

    const elevationDelta = (current.elevation ?? 0) - (previous.elevation ?? 0);
    if (elevationDelta > 0) elevationGain += elevationDelta;
  }

  const movingHours = movingMs / (1000 * 60 * 60);
  const paceMinutes = distanceKm > 0 ? (movingMs / 60000) / distanceKm : 0;
  const pace = paceMinutes > 0 && Number.isFinite(paceMinutes)
    ? `${Math.floor(paceMinutes)}:${Math.round((paceMinutes % 1) * 60).toString().padStart(2, '0')} min/km`
    : '-';

  return {
    name,
    activity,
    points,
    distanceKm,
    movingHours,
    elevationGain,
    pace,
    startTime: points[0]?.timestamp,
  };
};

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

  const shareText = useMemo(() => {
    if (!summary) return '';
    return [
      summary.name,
      `${summary.distanceKm.toFixed(2)} km`,
      `${summary.elevationGain.toFixed(0)} m gain`,
      summary.pace !== '-' ? summary.pace : null,
      'Recorded with AllTracks',
    ].filter(Boolean).join(' · ');
  }, [summary]);

  const shareSummary = async () => {
    if (!shareText) return;

    try {
      const nav = navigator as Navigator & {
        share?: (data: { title?: string; text?: string }) => Promise<void>;
      };

      if (nav.share) {
        await nav.share({ title: summary?.name || 'AllTracks activity', text: shareText });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        return;
      }

      throw new Error('Sharing is not available in this browser.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setLoadError(error instanceof Error ? error.message : 'Unable to share this summary.');
    }
  };

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
        points={summary.points.length}
        isSaving={isSubmitting}
        onSaveGpx={() => runExport('gpx', 'local', safeFilename(summary.name), trackType)}
        onMoreOptions={() => setShowOptions(true)}
        onShare={shareSummary}
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
