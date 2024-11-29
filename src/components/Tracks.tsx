import React from 'react';

import './Tracks.css';
import { useStats } from '../context/StatsContext'; 
import { useGlobalContext } from './Store';
import { useAlltracks } from './Store';
import { parseTracks } from '../utils/trackUtils';
import { Track } from "../api/alltracks/backend.did"
import { Link } from 'react-router-dom';


export const Tracks: React.FC = () => {

  const alltracks = useAlltracks();
  const { state: { isAuthed, principal } } = useGlobalContext();
  const [tracks, setTracks] = React.useState<Track[]>([]);
  const [trackVisibility, setTrackVisibility] = React.useState<'public' | 'private'>('public');
  const { settings } = useStats();

  React.useEffect(() => {
    if (isAuthed) {
      fetchTracks();
    }
  }, [isAuthed, trackVisibility]);


  const fetchTracks = async () => {
    let items = [];
    const tks = await alltracks.getTracks({user: principal })

   
    const formattedTracks = parseTracks(tks);
    console.log(formattedTracks)
    setTracks(formattedTracks);
  };

  return (
    <div className="tracks-section">
      <div className="settings-header">
        <h3>My Tracks</h3>
      </div>
      <div className="track-visibility-selector">
        <label>
          <input
            type="radio"
            name="trackVisibility"
            value="private"
            checked={trackVisibility === 'private'}
            onChange={(e) => setTrackVisibility(e.target.value as 'private' | 'public')}
          />
          Private Tracks
        </label>
        <label>
          <input
            type="radio"
            name="trackVisibility"
            value="public"
            checked={trackVisibility === 'public'}
            onChange={(e) => setTrackVisibility(e.target.value as 'private' | 'public')}
          />
          Public Tracks
        </label>
      </div>

      <div className="tracks-list">
        {tracks.length > 0 ? (
          tracks.map((track) => (
            <Link to={`/track/${track.id}`} key={track.startime} className="track-item">
            <div key={track.startime} className="track-item">
              <span className="material-icons">route</span>
              <div className="track-info">
                <div className="track-title">[{new Date(Number(track.startime)).toLocaleDateString()}] {track.name}</div>
                <div className="track-meta">
                  <span>{track.length} km</span>
                  <span>{track.duration} hr</span>
                  <span>{track.elevation} m</span>
                  
                </div>
              </div>

            </div>
            </Link>
          ))
        ) : (
          <div className="empty-tracks">
            <span className="material-icons">hiking</span>
            <p>No tracks created yet. Start by creating your first track!</p>
          </div>
        )}
      </div>
    </div>
  );
};
