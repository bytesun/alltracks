import React, { useState, useEffect } from 'react';
import { getAllTracksFromIndexDB, clearTrackFromIndexDB } from '../utils/IndexDBHandler';
import "../styles/ClearTracksModal.css";

interface ClearTracksModalProps {
  onClose: () => void;
  onClear: () => void;
}

export const ClearTracksModal: React.FC<ClearTracksModalProps> = ({ onClose, onClear }) => {
  const [tracks, setTracks] = useState<any[]>([]);

  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    const localTracks = await getAllTracksFromIndexDB();
    setTracks(localTracks);
  };

  const handleClearTrack = async (trackId: string) => {
    await clearTrackFromIndexDB(trackId);
    await loadTracks();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Local Stored Tracks</h3>
        <div className="tracks-list">
          {tracks.length > 0 ? (
            tracks.map((track) => {
              const pts = track.points || [];
              const firstTs = pts.length > 0 ? new Date(pts[0].timestamp).toLocaleString() : '–';
              const count = pts.length || 0;
              const name = track.name || 'Unnamed';
              return (
                <div key={track.id} className="track-item">
                  <span className="track-name">{name}</span>
                  <span className="track-ts">{firstTs}</span>
                  <span className="track-count">{count} points</span>
                  <button onClick={() => handleClearTrack(track.id)}>x</button>
                </div>
              );
            })
          ) : (
            <div className="empty-tracks">
              <span className="material-icons">info</span>
              <p>No local tracks found</p>
            </div>
          )}
        </div>
        <div className="modal-buttons clear-modal-buttons">
          <button onClick={onClear} className='clear-all-button'>Clear This </button>
          <button onClick={onClose} className='cancel-button'>Close</button>
        </div>
      </div>
    </div>
  );
};
