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
            tracks.map((track) => (
              <div key={track.id} className="track-item">
                <span>{new Date(track.points[0].timestamp).toLocaleString()}</span>
                <span>{track.points.length} points</span>
                <button onClick={() => handleClearTrack(track.id)}>x</button>
              </div>
            ))
          ) : (
            <div className="empty-tracks">
              <span className="material-icons">info</span>
              <p>No local tracks found</p>
            </div>
          )}
        </div>
        <div className="modal-buttons clear-modal-buttons">
          <button onClick={onClear} className='clear-all-button'>Clear Thhis </button>
          <button onClick={onClose} className='cancel-button'>Close</button>
        </div>
      </div>
    </div>
  );
};
