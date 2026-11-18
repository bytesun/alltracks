import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import '../styles/StartTrackModal.css';
import Cookies from 'js-cookie';
import { Group } from '../api/alltracks/backend.did';
import { useGlobalContext, useAlltracks } from './Store';
import {
  getAllTracksFromIndexDB,
  getTrackMetadataFromIndexDB,
  saveTrackPointsToIndexDB,
} from '../utils/IndexDBHandler';

interface StartTrackModalProps {
  onClose: () => void;
  onStart: (trackSetting: {
    trackId: string;
    groupId: string;
    wallet: any;
    recordingMode: 'manual' | 'auto';
    autoRecordingSettings: {
      minTime: number;
      minDistance: number;
    };
    trackType: string;
    trackName?: string;
  }) => void;
}

const activityOptions = [
  { value: 'hiking', label: 'Hiking', icon: 'hiking' },
  { value: 'running', label: 'Running', icon: 'directions_run' },
  { value: 'cycling', label: 'Cycling', icon: 'directions_bike' },
  { value: 'rowing', label: 'Rowing', icon: 'rowing' },
  { value: 'traveling', label: 'Traveling', icon: 'explore' },
  { value: 'sailing', label: 'Sailing', icon: 'sailing' },
  { value: 'tracking', label: 'Tracking', icon: 'route' },
];

const makeDefaultTrackName = (trackType: string) => {
  const label = trackType.charAt(0).toUpperCase() + trackType.slice(1);
  const when = new Date().toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return [label, when].join(' · ');
};

export const StartTrackModal: React.FC<StartTrackModalProps> = ({ onClose, onStart }) => {
  const { state: { isAuthed } } = useGlobalContext();
  const alltracks = useAlltracks();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  const [trackId, setTrackId] = React.useState<string>(uuidv4());
  const [groupId, setGroupId] = React.useState<string>(Cookies.get('groupId') || '0');
  const [recordingMode] = React.useState<'manual' | 'auto'>('manual');
  const [existingTracks, setExistingTracks] = React.useState<{ id: string; timestamp: number; name?: string }[]>([]);
  const [selectedTrack, setSelectedTrack] = React.useState<string>('new');
  const [wallet, setWallet] = React.useState<any>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [trackType, setTrackType] = React.useState<string>('hiking');
  const [trackName, setTrackName] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [autoRecordingSettings] = React.useState({ minTime: 10, minDistance: 10 });

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      } else if (event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    if (isAuthed) {
      alltracks.getMyGroups(0n, 100n).then(setGroups).catch(() => {
        // Starting a personal track does not require loading groups.
      });
    }
  }, [alltracks, isAuthed]);

  useEffect(() => {
    if (groupId) Cookies.set('groupId', groupId);
  }, [groupId]);

  useEffect(() => {
    const savedWallet = Cookies.get('arweave_wallet');
    if (savedWallet) {
      try {
        setWallet(JSON.parse(savedWallet));
      } catch {
        // An outdated wallet cookie should not block local tracking.
      }
    }
  }, []);

  useEffect(() => {
    const loadTracks = async () => {
      try {
        const tracks = await getAllTracksFromIndexDB();
        setExistingTracks(
          (tracks || []).map((track: any) => ({
            id: track.id,
            timestamp: track.timestamp || Date.now(),
            name: track.name || '',
          }))
        );
      } catch {
        // A fresh track can still be started if local persistence is unavailable.
      }
    };
    void loadTracks();
  }, []);

  const handleTrackSelection = (value: string) => {
    setSelectedTrack(value);
    if (value === 'new') {
      setTrackId(uuidv4());
      setTrackName('');
      setTrackType('hiking');
      return;
    }

    (async () => {
      try {
        const record = await getTrackMetadataFromIndexDB(value);
        if (record) {
          setTrackId(record.id || value);
          setTrackName(record.name || '');
          setTrackType(record.type || record.trackType || 'hiking');
          if (record.groupId) setGroupId(record.groupId);
        } else {
          setTrackId(value);
        }
      } catch {
        setTrackId(value);
      }
    })();
  };

  const startTrack = async () => {
    if (isStarting) return;
    setIsStarting(true);

    const idToSave = trackId || uuidv4();
    const isNewTrack = selectedTrack === 'new' || existingTracks.length === 0;
    const resolvedName = trackName.trim() || makeDefaultTrackName(trackType);

    setTrackId(idToSave);
    setTrackName(resolvedName);

    try {
      if (isNewTrack) {
        await saveTrackPointsToIndexDB(idToSave, [], trackType, resolvedName, groupId);
      }
    } catch {
      // IndexedDB persistence should not block starting an outdoor recording.
    }

    try {
      onStart({
        trackId: idToSave,
        groupId,
        wallet,
        recordingMode,
        autoRecordingSettings,
        trackType,
        trackName: resolvedName,
      });
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="start-track-overlay">
      <div
        ref={dialogRef}
        className="start-track-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-track-title"
        aria-describedby="start-track-description"
        tabIndex={-1}
      >
        <header className="start-track-header">
          <div className="start-track-header-icon" aria-hidden="true">
            <span className="material-icons">route</span>
          </div>
          <div className="start-track-heading">
            <h2 id="start-track-title">Start a track</h2>
            <p id="start-track-description">Choose your activity and get moving.</p>
          </div>
          <button
            className="start-track-close"
            type="button"
            onClick={onClose}
            aria-label="Close start track dialog"
          >
            <span className="material-icons" aria-hidden="true">close</span>
          </button>
        </header>

        <form
          className="start-track-form"
          aria-busy={isStarting}
          onSubmit={(event) => {
            event.preventDefault();
            void startTrack();
          }}
        >
          <div className="start-track-fields">
            {existingTracks.length > 0 && (
              <div className="start-track-field">
                <label htmlFor="start-track-existing">Track</label>
                <div className="start-track-select-wrap">
                  <select
                    id="start-track-existing"
                    value={selectedTrack}
                    onChange={(event) => handleTrackSelection(event.target.value)}
                  >
                    <option value="new">Create a new track</option>
                    {existingTracks.map((track) => (
                      <option key={track.id} value={track.id}>
                        Continue {track.name || track.id}
                      </option>
                    ))}
                  </select>
                  <span className="material-icons" aria-hidden="true">expand_more</span>
                </div>
              </div>
            )}

            <fieldset className="start-track-activity-field">
              <legend>Activity</legend>
              <div className="start-track-activities">
                {activityOptions.map((activity) => (
                  <button
                    key={activity.value}
                    type="button"
                    className={trackType === activity.value ? 'start-track-activity is-active' : 'start-track-activity'}
                    aria-pressed={trackType === activity.value}
                    onClick={() => setTrackType(activity.value)}
                  >
                    <span className="material-icons" aria-hidden="true">{activity.icon}</span>
                    <span>{activity.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="start-track-field">
              <label htmlFor="start-track-name">
                Track name <span className="start-track-optional">Optional</span>
              </label>
              <input
                id="start-track-name"
                type="text"
                value={trackName}
                onChange={(event) => setTrackName(event.target.value)}
                placeholder="e.g. Morning hike"
                autoComplete="off"
                aria-describedby="start-track-name-hint"
              />
              <p className="start-track-hint" id="start-track-name-hint">
                Leave blank to name it automatically.
              </p>
            </div>

            {isAuthed && groups.length > 0 && (
              <div className="start-track-advanced">
                <button
                  type="button"
                  className="start-track-advanced-toggle"
                  onClick={() => setShowAdvanced((value) => !value)}
                  aria-expanded={showAdvanced}
                  aria-controls="start-track-advanced-content"
                >
                  <span className="material-icons" aria-hidden="true">tune</span>
                  <span>Advanced options</span>
                  <span className="material-icons start-track-chevron" aria-hidden="true">
                    {showAdvanced ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {showAdvanced && (
                  <div id="start-track-advanced-content" className="start-track-advanced-content">
                    <div className="start-track-field">
                      <label htmlFor="start-track-group">Save under</label>
                      <div className="start-track-select-wrap">
                        <select
                          id="start-track-group"
                          value={groupId}
                          onChange={(event) => setGroupId(event.target.value)}
                        >
                          <option value="0">Personal</option>
                          {groups.map((group) => (
                            <option key={group.id} value={group.id}>{group.name}</option>
                          ))}
                        </select>
                        <span className="material-icons" aria-hidden="true">expand_more</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <footer className="start-track-footer">
            <button type="button" className="start-track-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="start-track-submit" disabled={isStarting}>
              <span className="material-icons" aria-hidden="true">play_arrow</span>
              {isStarting ? 'Starting…' : 'Start track'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
