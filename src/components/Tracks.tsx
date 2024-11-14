import React from 'react';
import { User, listDocs } from "@junobuild/core";
import './Tracks.css';
import { useStats } from '../context/StatsContext'; 
interface TrackData {
  filename: string;
  distance: number;
  duration: number;
  elevationGain: number;
  startime: number;
}

export const Tracks: React.FC<{ user: User | null }> = ({ user }) => {
  const [tracks, setTracks] = React.useState<TrackData[]>([]);
  const [trackVisibility, setTrackVisibility] = React.useState<'public' | 'private'>('public');
  const { settings } = useStats();

  React.useEffect(() => {
    if (user) {
      fetchTracks();
    }
  }, [user, trackVisibility]);


  const fetchTracks = async () => {
    let items = [];
    if (trackVisibility === 'public') {
      const result = await listDocs<TrackData>({
        collection: "tracks",
        filter: {
          owner: user.owner
        }
      });
      items = result.items;
    } else {
      const result = await listDocs<TrackData>({
        satellite: { satelliteId: settings.storageId },
        collection: "tracks"        
      });
      items = result.items;
    }
    const formattedTracks = items.map(doc => ({

      filename: doc.data.filename,
      distance: doc.data.distance,
      duration: doc.data.duration,
      elevationGain: doc.data.elevationGain,
      startime: doc.data.startime,
    }));

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
          Private 
        </label>
        <label>
          <input
            type="radio"
            name="trackVisibility"
            value="public"
            checked={trackVisibility === 'public'}
            onChange={(e) => setTrackVisibility(e.target.value as 'private' | 'public')}
          />
          Public 
        </label>
      </div>

      <div className="tracks-list">
        {tracks.length > 0 ? (
          tracks.map((track) => (
            <div key={track.startime} className="track-item">
              <span className="material-icons">route</span>
              <div className="track-info">
                <div className="track-title">{track.filename}</div>
                <div className="track-meta">
                  <span>{track.distance.toFixed(2)} km</span>
                  <span>{track.duration.toFixed(2)} hr</span>
                  <span>{track.elevationGain.toFixed(2)} m</span>
                  <span>{track.startime}</span>
                </div>
              </div>

            </div>
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
