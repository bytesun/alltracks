import React, { useState, useEffect } from 'react';

import { v4 as uuidv4 } from 'uuid';
import { openDB } from 'idb';
import "../styles/StartTrackModal.css";
import Cookies from 'js-cookie';
import { Group } from '../api/alltracks/backend.did';
import { useGlobalContext, useAlltracks } from './Store';

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

const makeDefaultTrackName = (trackType: string) => {
  const label = trackType.charAt(0).toUpperCase() + trackType.slice(1);
  const when = new Date().toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${label} · ${when}`;
};

export const StartTrackModal: React.FC<StartTrackModalProps> = ({
  onClose,
  onStart
}) => {
  const { state: { isAuthed } } = useGlobalContext();
  const alltracks = useAlltracks();

  const [trackId, setTrackId] = React.useState<string>(uuidv4());
  const [groupId, setGroupId] = React.useState<string>(Cookies.get('groupId') || '0');
  const [recordingMode] = React.useState<'manual' | 'auto'>('manual');
  const [existingTracks, setExistingTracks] = React.useState<{ id: string, timestamp: number, name?: string }[]>([]);
  const [selectedTrack, setSelectedTrack] = React.useState<string>('new');
  const [wallet, setWallet] = React.useState<any>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [trackType, setTrackType] = React.useState<string>('hiking');
  const [trackName, setTrackName] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [autoRecordingSettings] = React.useState({
    minTime: 10,
    minDistance: 10,
  });

  useEffect(() => {
    if (isAuthed) {
      fetchGroups();
    }
  }, [isAuthed]);

  React.useEffect(() => {
    if (groupId) {
      Cookies.set('groupId', groupId);
    }
  }, [groupId]);

  React.useEffect(() => {
    const savedWallet = Cookies.get('arweave_wallet');
    if (savedWallet) {
      setWallet(JSON.parse(savedWallet));
    }
  }, []);

  React.useEffect(() => {
    const loadTracks = async () => {
      try {
        const db = await openDB('tracks-db', 2);
        const tracks = await db.getAll('tracks');
        setExistingTracks(
          (tracks || []).map((track: any) => ({
            id: track.id,
            timestamp: track.timestamp || Date.now(),
            name: track.name || ''
          }))
        );
      } catch (error) {
        // Local history is optional. A fresh track can still be started.
      }
    };
    loadTracks();
  }, []);

  const fetchGroups = async () => {
    const myGroups = await alltracks.getMyGroups(0n, 100n);
    setGroups(myGroups);
  };

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
        const db = await openDB('tracks-db', 2);
        const rec = await db.get('tracks', value);
        if (rec) {
          setTrackId(rec.id || value);
          setTrackName(rec.name || '');
          setTrackType(rec.type || rec.trackType || 'hiking');
          if (rec.groupId) {
            setGroupId(rec.groupId);
          }
        } else {
          setTrackId(value);
        }
      } catch (err) {
        setTrackId(value);
      }
    })();
  };

  const startTrack = async () => {
    const idToSave = trackId || uuidv4();
    const isNewTrack = selectedTrack === 'new' || existingTracks.length === 0;
    const resolvedName = trackName.trim() || makeDefaultTrackName(trackType);

    setTrackId(idToSave);
    setTrackName(resolvedName);

    try {
      if (isNewTrack) {
        const db = await openDB('tracks-db', 2, {
          upgrade(db) {
            if (!db.objectStoreNames.contains('tracks')) {
              db.createObjectStore('tracks', { keyPath: 'id' });
            }
          }
        });
        const record = {
          id: idToSave,
          timestamp: Date.now(),
          name: resolvedName,
          trackType,
          groupId,
        };
        await db.put('tracks', record);
      }
    } catch (err) {
      // IndexedDB persistence should not block starting an outdoor recording.
    }

    onStart({
      trackId: idToSave,
      groupId,
      wallet,
      recordingMode,
      autoRecordingSettings,
      trackType,
      trackName: resolvedName,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-body">
          <button className="modal-close-btn" onClick={onClose} aria-label="Close start track dialog">
            <span className="material-icons">close</span>
          </button>

          <section className="track-selection">
            {existingTracks.length > 0 && (
              <div className="setting-row">
                <div className="setting-label">
                  <span>Track</span>
                </div>
                <div className="setting-control">
                  <select
                    value={selectedTrack}
                    onChange={(e) => handleTrackSelection(e.target.value)}
                    className="track-select"
                  >
                    <option value="new">New track</option>
                    {existingTracks.map(track => (
                      <option key={track.id} value={track.id}>
                        Continue {track.name || track.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="setting-row">
              <div className="setting-label">
                <span>Activity</span>
              </div>
              <div className="setting-control">
                <select
                  value={trackType}
                  onChange={e => setTrackType(e.target.value)}
                  className="track-type-select"
                >
                  <option value="hiking">Hiking</option>
                  <option value="traveling">Traveling</option>
                  <option value="running">Running</option>
                  <option value="cycling">Cycling</option>
                  <option value="rowing">Rowing</option>
                  <option value="sailing">Sailing</option>
                  <option value="tracking">Tracking</option>
                </select>
              </div>
            </div>

            <div className="setting-row">
              <div className="setting-label">
                <span>Name</span>
              </div>
              <div className="setting-control">
                <input
                  type="text"
                  value={trackName}
                  onChange={(e) => setTrackName(e.target.value)}
                  placeholder="Optional — AllTracks will name it for you"
                />
              </div>
            </div>

            {isAuthed && groups.length > 0 && (
              <>
                <button
                  type="button"
                  className="advanced-options-toggle"
                  onClick={() => setShowAdvanced((value) => !value)}
                  aria-expanded={showAdvanced}
                >
                  <span className="material-icons">tune</span>
                  {showAdvanced ? 'Hide options' : 'Advanced options'}
                </button>

                {showAdvanced && (
                  <div className="setting-row">
                    <div className="setting-label">
                      <span>Group</span>
                    </div>
                    <div className="setting-control">
                      <select
                        value={groupId}
                        onChange={(e) => setGroupId(e.target.value)}
                        className="group-select"
                      >
                        <option value="0">Personal</option>
                        {groups.map((group) => (
                          <option key={group.id} value={group.id}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        <footer className="modal-footer">
          <button onClick={startTrack}>
            Start
          </button>
        </footer>
      </div>
    </div>
  );
};
