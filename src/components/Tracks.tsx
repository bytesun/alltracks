import React from 'react';
import { Principal } from '@dfinity/principal';
import { Link } from 'react-router-dom';
import { useAlltracks, useGlobalContext } from './Store';
import { parseTracks } from '../utils/trackUtils';
import { getCompletedActivitiesFromIndexDB } from '../utils/IndexDBHandler';
import { CompletedActivity } from '../types/CompletedActivity';
import { formatDuration } from '../utils/activityMetrics';
import '../styles/Tracks.css';

type HistorySource = 'all' | 'local' | 'cloud';

type HistoryItem = {
  key: string;
  id: string;
  name: string;
  activity: string;
  startTime: number;
  distanceKm: number;
  durationHours: number;
  elevationGain: number;
  source: 'local' | 'cloud';
};

const localToHistoryItem = (activity: CompletedActivity): HistoryItem => ({
  key: `local-${activity.id}`,
  id: activity.id,
  name: activity.name,
  activity: activity.activity,
  startTime: activity.startTime || activity.completedAt,
  distanceKm: activity.distanceKm,
  durationHours: activity.movingHours,
  elevationGain: activity.elevationGain,
  source: 'local',
});

export const Tracks: React.FC<{ userId?: string }> = ({ userId }) => {
  const alltracks = useAlltracks();
  const { state: { isAuthed, principal } } = useGlobalContext();
  const [items, setItems] = React.useState<HistoryItem[]>([]);
  const [sourceFilter, setSourceFilter] = React.useState<HistorySource>('all');
  const [loading, setLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState('');

  React.useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      setLoading(true);
      setErrorMessage('');
      const merged: HistoryItem[] = [];
      const currentPrincipal = principal?.toText();
      const viewingOwnHistory = !userId || Boolean(currentPrincipal && userId === currentPrincipal);

      if (viewingOwnHistory) {
        try {
          const localActivities = await getCompletedActivitiesFromIndexDB();
          merged.push(...localActivities.map(localToHistoryItem));
        } catch (error) {
          console.error('Unable to load local activity history', error);
          setErrorMessage('Local activity history is temporarily unavailable.');
        }
      }

      const targetUser = userId || currentPrincipal;
      if (isAuthed && targetUser) {
        try {
          const tracks = await alltracks.getTracks({ user: Principal.fromText(targetUser) }, 0n, 100n);
          const parsed = parseTracks(tracks as any);
          merged.push(...parsed.map((track: any) => ({
            key: `cloud-${String(track.id)}`,
            id: String(track.id),
            name: track.name || 'Unnamed activity',
            activity: 'Cloud activity',
            startTime: Number(track.startime) || 0,
            distanceKm: Number(track.length) || 0,
            durationHours: Number(track.duration) || 0,
            elevationGain: Number(track.elevation) || 0,
            source: 'cloud' as const,
          })));
        } catch (error) {
          console.error('Unable to load cloud track history', error);
          setErrorMessage((current) => current || 'Cloud activities could not be loaded. Local history is still available.');
        }
      }

      if (active) {
        setItems(merged.sort((a, b) => b.startTime - a.startTime));
        setLoading(false);
      }
    };

    loadHistory();
    return () => {
      active = false;
    };
  }, [alltracks, isAuthed, principal, userId]);

  const visibleItems = items.filter((item) => sourceFilter === 'all' || item.source === sourceFilter);
  const localCount = items.filter((item) => item.source === 'local').length;
  const cloudCount = items.filter((item) => item.source === 'cloud').length;
  const isOwnHistory = !userId || Boolean(principal && userId === principal.toText());

  return (
    <section className="tracks-section">
      <header className="history-header">
        <div>
          <p className="history-eyebrow">Activity log</p>
          <h1>{isOwnHistory ? 'History' : 'Activity History'}</h1>
          <p>{isOwnHistory
            ? 'Revisit completed routes, open activity details, and share an AllTracks outdoor card.'
            : 'Browse the activities this user has shared to AllTracks.'}</p>
        </div>
        <div className="history-count" aria-label={`${items.length} activities`}>
          <strong>{items.length}</strong>
          <span>activities</span>
        </div>
      </header>

      <div className="history-filters" role="group" aria-label="Filter activity history">
        <button type="button" className={sourceFilter === 'all' ? 'active' : ''} onClick={() => setSourceFilter('all')}>
          All <span>{items.length}</span>
        </button>
        {isOwnHistory && (
          <button type="button" className={sourceFilter === 'local' ? 'active' : ''} onClick={() => setSourceFilter('local')}>
            On device <span>{localCount}</span>
          </button>
        )}
        <button type="button" className={sourceFilter === 'cloud' ? 'active' : ''} onClick={() => setSourceFilter('cloud')}>
          Cloud <span>{cloudCount}</span>
        </button>
      </div>

      {!isAuthed && isOwnHistory && (
        <div className="history-local-note">
          <span className="material-icons">smartphone</span>
          <span>Local activities stay on this device. Sign in when you want to add your cloud history.</span>
        </div>
      )}

      {errorMessage && <div className="history-message" role="status">{errorMessage}</div>}

      {loading ? (
        <div className="history-loading">
          <span className="material-icons">progress_activity</span>
          Loading activities…
        </div>
      ) : visibleItems.length > 0 ? (
        <div className="tracks-grid">
          {visibleItems.map((item) => (
            <Link
              to={`/track/${encodeURIComponent(item.id)}?source=${item.source}`}
              key={item.key}
              className="track-card"
              aria-label={`Open ${item.name}`}
            >
              <div className="track-card-topline">
                <span className={`history-source-badge ${item.source}`}>
                  <span className="material-icons">{item.source === 'local' ? 'smartphone' : 'cloud_done'}</span>
                  {item.source === 'local' ? 'On device' : 'Cloud'}
                </span>
                <span className="track-date">
                  {item.startTime ? new Date(item.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Activity'}
                </span>
              </div>

              <div className="track-title-row">
                <div>
                  <span className="track-activity-label">{item.activity}</span>
                  <h3>{item.name}</h3>
                </div>
                <span className="material-icons track-open-icon">arrow_forward</span>
              </div>

              <div className="track-stats">
                <div className="history-stat">
                  <span>Distance</span>
                  <strong>{item.distanceKm.toFixed(2)} km</strong>
                </div>
                <div className="history-stat">
                  <span>Time</span>
                  <strong>{formatDuration(item.durationHours)}</strong>
                </div>
                <div className="history-stat">
                  <span>Gain</span>
                  <strong>{item.elevationGain.toFixed(0)} m</strong>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="history-empty">
          <span className="material-icons">route</span>
          <h2>No activities here yet</h2>
          <p>{isOwnHistory
            ? 'Finish a recording and save it locally, or sign in to see cloud activities.'
            : 'No shared cloud activities are available for this user.'}</p>
          {isOwnHistory && <Link to="/">Record an activity</Link>}
        </div>
      )}
    </section>
  );
};
