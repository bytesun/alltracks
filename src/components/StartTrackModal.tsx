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

export const StartTrackModal: React.FC<StartTrackModalProps> = ({
  onClose,
  onStart
}) => {

  const { state: { isAuthed } } = useGlobalContext();
  const alltracks = useAlltracks();

  const [trackId, setTrackId] = React.useState<string>(uuidv4());
  const [groupId, setGroupId] = React.useState<string>(Cookies.get('groupId') || '0');
  const [recordingMode, setRecordingMode] = React.useState<'manual' | 'auto'>('manual');
  const [existingTracks, setExistingTracks] = React.useState<{ id: string, timestamp: number, name?: string }[]>([]);
  const [selectedTrack, setSelectedTrack] = React.useState<string>('');
  const [wallet, setWallet] = React.useState<any>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [trackType, setTrackType] = React.useState<string>('hiking');
  const [trackName, setTrackName] = useState<string>('');
  const [autoRecordingSettings, setAutoRecordingSettings] = React.useState({
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
        // console.error("Error loading tracks:", error);
      }
    };
    loadTracks();
  }, []);

  const fetchGroups = async () => {
    const groups = await alltracks.getMyGroups();
    setGroups(groups);
  };

  const handleTrackSelection = (value: string) => {
    setSelectedTrack(value);
    if (value === 'new') {
      // generate a fresh id for the new track
      setTrackId(uuidv4());
      setTrackName('');
      setTrackType('hiking');
    } else {
      // existing track selected -> load metadata from IndexedDB
      (async () => {
        try {
          const db = await openDB('tracks-db', 2);
          const rec = await db.get('tracks', value);
          if (rec) {
            setTrackId(rec.id || value);
            setTrackName(rec.name || '');
            // some records use 'type' or 'trackType'
            setTrackType(rec.type || rec.trackType || 'hiking');
          } else {
            setTrackId(value);
          }
        } catch (err) {
          setTrackId(value);
        }
      })();
    }
  };

  const handleWalletUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    fileReader.onloadend = async (e) => {
      if (e.target?.result) {
        const wallet = JSON.parse(e.target.result as string);
        setWallet(wallet);
        Cookies.set('arweave_wallet', JSON.stringify(wallet), { expires: 7 });
      }
    };
    if (event.target.files?.[0]) {
      fileReader.readAsText(event.target.files[0]);
    }
  };

  const disconnectWallet = () => {
    setWallet(null);
    Cookies.remove('arweave_wallet');
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-body">
          <button className="modal-close-btn" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
          <section className="track-selection">
            {existingTracks.length > 0 && (
              <div className="setting-row">
                <div className="setting-label">
                  <span>Select Track</span>
                </div>
                <div className="setting-control">
                  <select
                    value={selectedTrack}
                    onChange={(e) => handleTrackSelection(e.target.value)}
                    className="track-select"
                  >
                    <option value="">Choose/Create a track</option>
                    <option value="new">➕ Create New Track</option>
                    {existingTracks.map(track => (
                      <option key={track.id} value={track.id}>
                        {track.name ? `🕒 ${track.name} (${track.id})` : `🕒 ${track.id}`}  ({new Date(track.timestamp).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* {(selectedTrack === 'new' || existingTracks.length === 0) && (
              <div className="setting-row">
                <div className="setting-label">
                  <span>Track ID</span>
                </div>
                <div className="setting-control">
                  <input
                    type="text"
                    value={trackId}
                    disabled
                    onChange={(e) => setTrackId(e.target.value)}
                    placeholder="Enter track identifier"
                  />
                </div>
              </div>
            )} */}

            {isAuthed && groups.length > 0 && (
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
                    <option value="0">No Group</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="setting-row">
              <div className="setting-label">
                <span>Track Type</span>
              </div>
              <div className="setting-control">
                <select
                  value={trackType}
                  onChange={e => setTrackType(e.target.value)}
                  className="track-type-select"
                >
                  <option value="hiking">Hiking</option>
                  <option value="travaling">Traveling</option>
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
                <span>Track Name</span>
              </div>
              <div className="setting-control">
                <input
                  type="text"
                  value={trackName}
                  onChange={(e) => setTrackName(e.target.value)}
                  placeholder="Enter a friendly name for this track"
                />
              </div>
            </div>
          </section>

          {/* <section className="recording-settings">

            <div className="recording-mode-toggle">
              <label className={`mode-option ${recordingMode === 'manual' ? 'active' : ''}`}>
                <input
                  type="radio"
                  value="manual"
                  checked={recordingMode === 'manual'}
                  onChange={() => setRecordingMode('manual')}
                />
                <span className="material-icons">touch_app</span>
                Manual
              </label>
              <label className={`mode-option ${recordingMode === 'auto' ? 'active' : ''}`}>
                <input
                  type="radio"
                  value="auto"
                  checked={recordingMode === 'auto'}
                  onChange={() => setRecordingMode('auto')}
                />
                <span className="material-icons">autorenew</span>
                Automatic
              </label>
            </div>

            {recordingMode === 'auto' && (
              <div className="auto-settings">
                <div className="setting-row">
                  <div className="setting-label">
                    <span>Min Distance </span>
                  </div>
                  <div className="setting-control">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={autoRecordingSettings.minDistance}
                      onChange={(e) => setAutoRecordingSettings(prev => ({
                        ...prev,
                        minDistance: Number(e.target.value)
                      }))}
                    />
                    <div className="value-display">
                      <span>{autoRecordingSettings.minDistance}</span>
                      <span className="unit">m</span>
                    </div>
                  </div>
                </div>

                <div className="setting-row">
                  <div className="setting-label">
                    <span>Min Time </span>
                  </div>
                  <div className="setting-control">
                    <input
                      type="range"
                      min="1"
                      max="60"
                      value={autoRecordingSettings.minTime}
                      onChange={(e) => setAutoRecordingSettings(prev => ({
                        ...prev,
                        minTime: Number(e.target.value)
                      }))}
                    />
                    <div className="value-display">
                      <span>{autoRecordingSettings.minTime}</span>
                      <span className="unit">s</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section> */}
        </div>

        <footer className="modal-footer">
          {/* <section className="wallet-section">
            <input
              type="file"
              accept=".json"
              onChange={handleWalletUpload}
              style={{ display: 'none' }}
              id="wallet-upload"
            />
            {!wallet ? (
              <button
                className="wallet-button"
                onClick={() => document.getElementById('wallet-upload')?.click()}
              >
                <span className="material-icons">account_balance_wallet</span>
                Arweave Wallet
              </button>
            ) : (
              <button
                className="wallet-button connected"
                onClick={disconnectWallet}
              >
                <span className="material-icons">check_circle</span>
                Remove Wallet
              </button>
            )}
          </section> */}
          <button
            disabled={(() => {
              // allow starting an existing track without editing name
              if (selectedTrack && selectedTrack !== 'new') return false;
              // if there are no existing tracks, require a name
              if (existingTracks.length === 0) return trackName.trim() === '';
              // if creating new, require a name
              if (selectedTrack === 'new' || selectedTrack === '') return trackName.trim() === '';
              return true;
            })()}
            onClick={async () => {
              // ensure we have an id
              const idToSave = trackId || uuidv4();
              setTrackId(idToSave);
              try {
                // only create/update record if creating a new track
                if (selectedTrack === 'new' || existingTracks.length === 0) {
                  const db = await openDB('tracks-db', 2, {
                    upgrade(db) {
                      if (!db.objectStoreNames.contains('tracks')) {
                        db.createObjectStore('tracks', { keyPath: 'id' });
                      }
                    }
                  });
                  const record = { id: idToSave, timestamp: Date.now(), name: trackName, type: trackType };
                  await db.put('tracks', record);
                }
              } catch (err) {
                // ignore
              }
              onStart({
                trackId: idToSave,
                groupId,
                wallet,
                recordingMode,
                autoRecordingSettings,
                trackType,
                trackName
              });
            }}
          >
            Start
          </button>


        </footer>
      </div>
    </div>
  );
};