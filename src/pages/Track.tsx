import React, { useEffect, useMemo, useRef, useState } from 'react';
import { saveAs } from 'file-saver';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { TrackPoint } from '../types/TrackPoint';
import { CompletedActivity } from '../types/CompletedActivity';
import { parseCSV, parseGPX, parseKML } from '../utils/importFormats';
import { generateGPX } from '../utils/exportFormats';
import { calculateActivityMetrics, formatDuration } from '../utils/activityMetrics';
import { getCompletedActivityFromIndexDB } from '../utils/IndexDBHandler';
import { shareActivityCard } from '../utils/shareActivityCard';
import { useAlltracks } from '../components/Store';
import { parseTracks } from '../utils/trackUtils';
import { FILETYPE_GPX, FILETYPE_KML } from '../lib/constants';
import { ActivityShareCard } from '../components/ActivityShareCard';
import '../styles/Track.css';

type ActivityDetail = {
  id: string;
  source: 'local' | 'cloud';
  name: string;
  activity: string;
  description: string;
  startTime?: number;
  distanceKm: number;
  movingHours: number;
  elevationGain: number;
  pace: string;
  points: TrackPoint[];
};

const activityFromVariant = (trackType: unknown) => {
  if (!trackType || typeof trackType !== 'object') return 'Outdoor activity';
  const key = Object.keys(trackType as Record<string, unknown>)[0];
  const labels: Record<string, string> = {
    hike: 'Hiking',
    run: 'Running',
    bike: 'Cycling',
    paddle: 'Paddling',
    drive: 'Roadtrip',
    travel: 'Traveling',
    other: 'Outdoor activity',
  };
  return labels[key] || 'Outdoor activity';
};

const safeFilename = (value: string) =>
  value.trim().replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '') || 'alltracks-activity';

const parseRemotePoints = (content: string, fileType: string): TrackPoint[] => {
  if (fileType === FILETYPE_GPX) return parseGPX(content);
  if (fileType === FILETYPE_KML) return parseKML(content);
  return parseCSV(content);
};

const localActivityDetail = (activity: CompletedActivity): ActivityDetail => ({
  id: activity.id,
  source: 'local',
  name: activity.name,
  activity: activity.activity,
  description: 'Saved on this device',
  startTime: activity.startTime,
  distanceKm: activity.distanceKm,
  movingHours: activity.movingHours,
  elevationGain: activity.elevationGain,
  pace: activity.pace,
  points: activity.points,
});

const FitActivityBounds: React.FC<{ points: TrackPoint[] }> = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 15);
      return;
    }
    if (points.length > 1) {
      map.fitBounds(points.map((point) => [point.latitude, point.longitude] as [number, number]), {
        padding: [28, 28],
      });
    }
  }, [map, points]);

  return null;
};

export const TrackPage: React.FC = () => {
  const alltracks = useAlltracks();
  const { trackId = '' } = useParams<{ trackId: string }>();
  const [searchParams] = useSearchParams();
  const requestedSource = searchParams.get('source');
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [shareStatus, setShareStatus] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    const loadCloud = async (): Promise<ActivityDetail | null> => {
      const response = await alltracks.getTrack(trackId);
      if (!response || response.length === 0) return null;

      const rawTrack = response[0] as any;
      const parsed = parseTracks(response as any)[0] as any;
      const fileResponse = await fetch(parsed.trackfile.url);
      if (!fileResponse.ok) throw new Error('Unable to download this activity route.');
      const content = await fileResponse.text();
      const points = parseRemotePoints(content, parsed.trackfile.fileType);
      const metrics = calculateActivityMetrics(points);

      return {
        id: String(parsed.id),
        source: 'cloud',
        name: parsed.name || 'Unnamed activity',
        activity: activityFromVariant(rawTrack.trackType),
        description: parsed.description || 'Saved to AllTracks',
        startTime: Number(parsed.startime) || metrics.startTime,
        distanceKm: Number(parsed.length) || metrics.distanceKm,
        movingHours: Number(parsed.duration) || metrics.movingHours,
        elevationGain: Number(parsed.elevation) || metrics.elevationGain,
        pace: metrics.pace,
        points,
      };
    };

    const loadActivity = async () => {
      setLoading(true);
      setErrorMessage('');
      setShareStatus('');
      try {
        let next: ActivityDetail | null = null;

        if (requestedSource !== 'cloud') {
          const local = await getCompletedActivityFromIndexDB(trackId);
          if (local) next = localActivityDetail(local);
          if (requestedSource === 'local' && !local) {
            throw new Error('This local activity is no longer stored on this device.');
          }
        }

        if (!next && requestedSource !== 'local') {
          next = await loadCloud();
        }

        if (!next) throw new Error('Activity not found.');
        if (active) {
          setActivity(next);
          setCurrentPointIndex(0);
        }
      } catch (error) {
        console.error('Unable to load activity detail', error);
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Unable to load this activity.');
      } finally {
        if (active) setLoading(false);
      }
    };

    if (trackId) loadActivity();
    else {
      setErrorMessage('Activity not found.');
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [alltracks, requestedSource, trackId]);

  useEffect(() => () => {
    if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
  }, []);

  const notablePoints = useMemo(() => {
    if (!activity?.points.length) return [];
    return activity.points.filter((point, index, points) => Boolean(point.comment) || index === 0 || index === points.length - 1);
  }, [activity]);

  const stopPlayback = () => {
    setIsPlaying(false);
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
  };

  const togglePlayback = () => {
    if (!activity || activity.points.length < 2) return;
    if (isPlaying) {
      stopPlayback();
      return;
    }

    setIsPlaying(true);
    playbackIntervalRef.current = setInterval(() => {
      setCurrentPointIndex((current) => {
        if (current >= activity.points.length - 1) {
          if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
          playbackIntervalRef.current = null;
          setIsPlaying(false);
          return 0;
        }
        return current + 1;
      });
    }, 900 / playbackSpeed);
  };

  const resetPlayback = () => {
    stopPlayback();
    setCurrentPointIndex(0);
  };

  const downloadGpx = () => {
    if (!activity?.points.length) return;
    const content = generateGPX(activity.points);
    saveAs(new Blob([content], { type: 'application/gpx+xml;charset=utf-8' }), `${safeFilename(activity.name)}.gpx`);
  };

  const shareCard = async () => {
    if (!activity) return;
    setShareStatus('');
    setIsSharing(true);
    const shareText = [
      activity.name,
      `${activity.distanceKm.toFixed(2)} km`,
      `${activity.elevationGain.toFixed(0)} m gain`,
      activity.pace !== '-' ? activity.pace : null,
      'Recorded with AllTracks',
    ].filter(Boolean).join(' · ');

    try {
      const result = await shareActivityCard(cardRef.current, activity.name, shareText);
      setShareStatus(result === 'shared' ? 'Outdoor card shared.' : 'Outdoor card downloaded as PNG.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareStatus(error instanceof Error ? error.message : 'Unable to share this activity card.');
    } finally {
      setIsSharing(false);
    }
  };

  if (loading) {
    return (
      <main className="activity-detail-state">
        <span className="material-icons">progress_activity</span>
        <h1>Loading activity…</h1>
      </main>
    );
  }

  if (!activity || errorMessage) {
    return (
      <main className="activity-detail-state">
        <span className="material-icons">wrong_location</span>
        <h1>Activity unavailable</h1>
        <p>{errorMessage || 'This activity could not be loaded.'}</p>
        <Link to="/history">Back to History</Link>
      </main>
    );
  }

  const currentPoint = activity.points[currentPointIndex];

  return (
    <main className="activity-detail-page">
      <header className="activity-detail-header">
        <div>
          <Link to="/history" className="activity-detail-back">
            <span className="material-icons">arrow_back</span>
            History
          </Link>
          <div className="activity-detail-kicker">
            <span className={`activity-detail-source ${activity.source}`}>
              <span className="material-icons">{activity.source === 'local' ? 'smartphone' : 'cloud_done'}</span>
              {activity.source === 'local' ? 'On device' : 'Cloud'}
            </span>
            <span>{activity.activity}</span>
          </div>
          <h1>{activity.name}</h1>
          {activity.description && <p>{activity.description}</p>}
        </div>
        <div className="activity-detail-header-actions">
          <button type="button" onClick={shareCard} disabled={isSharing}>
            <span className="material-icons">ios_share</span>
            {isSharing ? 'Creating…' : 'Share card'}
          </button>
          <button type="button" onClick={downloadGpx} disabled={!activity.points.length}>
            <span className="material-icons">download</span>
            GPX
          </button>
        </div>
      </header>

      {shareStatus && <div className="activity-detail-status" role="status">{shareStatus}</div>}

      <section className="activity-detail-stats" aria-label="Activity statistics">
        <div className="activity-detail-stat distance">
          <span>Distance</span>
          <strong>{activity.distanceKm.toFixed(2)} km</strong>
        </div>
        <div className="activity-detail-stat">
          <span>Moving time</span>
          <strong>{formatDuration(activity.movingHours)}</strong>
        </div>
        <div className="activity-detail-stat">
          <span>Elevation gain</span>
          <strong>{activity.elevationGain.toFixed(0)} m</strong>
        </div>
        <div className="activity-detail-stat">
          <span>Pace</span>
          <strong>{activity.pace}</strong>
        </div>
        <div className="activity-detail-stat">
          <span>Recorded points</span>
          <strong>{activity.points.length}</strong>
        </div>
        <div className="activity-detail-stat">
          <span>Date</span>
          <strong>{activity.startTime ? new Date(activity.startTime).toLocaleDateString() : '—'}</strong>
        </div>
      </section>

      <section className="activity-detail-layout">
        <div className="activity-detail-map-card">
          <div className="activity-detail-section-heading">
            <div>
              <span>Route</span>
              <h2>Where you moved</h2>
            </div>
            <div className="activity-playback-controls">
              <button type="button" onClick={togglePlayback} disabled={activity.points.length < 2} aria-label={isPlaying ? 'Pause route replay' : 'Replay route'}>
                <span className="material-icons">{isPlaying ? 'pause' : 'play_arrow'}</span>
              </button>
              <button type="button" onClick={resetPlayback} disabled={!currentPointIndex} aria-label="Reset route replay">
                <span className="material-icons">replay</span>
              </button>
              <select value={playbackSpeed} onChange={(event) => setPlaybackSpeed(Number(event.target.value))} aria-label="Replay speed">
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={4}>4x</option>
              </select>
            </div>
          </div>

          <div className="activity-detail-map">
            <MapContainer center={[49.2827, -123.1207]} zoom={10} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                attribution=""
                maxZoom={17}
              />
              <FitActivityBounds points={activity.points} />
              {activity.points.length > 1 && (
                <Polyline positions={activity.points.map((point) => [point.latitude, point.longitude] as [number, number])} pathOptions={{ weight: 4 }} />
              )}
              {activity.points[0] && (
                <CircleMarker center={[activity.points[0].latitude, activity.points[0].longitude]} radius={6} pathOptions={{ fillOpacity: 1 }} />
              )}
              {currentPoint && (
                <CircleMarker center={[currentPoint.latitude, currentPoint.longitude]} radius={isPlaying ? 8 : 5} pathOptions={{ fillOpacity: 1 }} />
              )}
            </MapContainer>
          </div>
          <div className="activity-playback-progress">
            <span>{activity.points.length ? currentPointIndex + 1 : 0} / {activity.points.length}</span>
            <div><i style={{ width: `${activity.points.length > 1 ? (currentPointIndex / (activity.points.length - 1)) * 100 : 0}%` }} /></div>
          </div>
        </div>

        <aside className="activity-detail-card-panel">
          <div className="activity-detail-section-heading">
            <div>
              <span>Share</span>
              <h2>Your outdoor card</h2>
            </div>
          </div>
          <ActivityShareCard
            ref={cardRef}
            name={activity.name}
            activity={activity.activity}
            startTime={activity.startTime}
            distanceKm={activity.distanceKm}
            movingHours={activity.movingHours}
            elevationGain={activity.elevationGain}
            pace={activity.pace}
            points={activity.points}
            sourceLabel={activity.source === 'local' ? 'Saved on this device' : 'Saved to AllTracks'}
          />
          <button className="activity-detail-card-share" type="button" onClick={shareCard} disabled={isSharing}>
            <span className="material-icons">ios_share</span>
            {isSharing ? 'Creating image…' : 'Share outdoor card'}
          </button>
        </aside>
      </section>

      <section className="activity-notes-section">
        <div className="activity-detail-section-heading">
          <div>
            <span>Moments</span>
            <h2>Notes & checkpoints</h2>
          </div>
          <span className="activity-notes-count">{notablePoints.length}</span>
        </div>
        {notablePoints.length > 0 ? (
          <div className="activity-notes-list">
            {notablePoints.map((point, index) => {
              const originalIndex = activity.points.indexOf(point);
              const isStart = originalIndex === 0;
              const isEnd = originalIndex === activity.points.length - 1;
              return (
                <button
                  type="button"
                  key={`${point.timestamp}-${index}`}
                  className={originalIndex === currentPointIndex ? 'active' : ''}
                  onClick={() => {
                    stopPlayback();
                    setCurrentPointIndex(originalIndex);
                  }}
                >
                  <span className="activity-note-icon material-icons">{isStart ? 'trip_origin' : isEnd ? 'flag' : 'place'}</span>
                  <span className="activity-note-copy">
                    <strong>{isStart ? 'Start' : isEnd ? 'Finish' : point.comment || 'Checkpoint'}</strong>
                    <small>{new Date(point.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small>
                    {point.comment && !isStart && !isEnd && <span>{point.comment}</span>}
                  </span>
                  <span className="material-icons activity-note-arrow">my_location</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="activity-notes-empty">No notes were added to this activity.</p>
        )}
      </section>
    </main>
  );
};
