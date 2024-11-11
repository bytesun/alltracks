import React from 'react';
import { User, listDocs } from "@junobuild/core";
import './Tracks.css';

interface TrackData {
  filename: string;
  distance: number;
  duration: number;
  elevationGain: number;
  startime: number;
}

export const Tracks: React.FC<{ user: User | null }> = ({ user }) => {
  const [tracks, setTracks] = React.useState<TrackData[]>([]);

  React.useEffect(() => {
   if (user) {
      fetchTracks();
    }
  }, [user]);

  
const fetchTracks = async () => {
  const { items } = await listDocs<TrackData>({
    collection: "tracks",
    filter: {
      owner: user.owner
    }
  });

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
      
      <div className="tracks-list">
        {tracks.length > 0 ? (
          tracks.map((track) => (
            <div key={track.startime} className="track-item">
              <span className="material-icons">route</span>
              <div className="track-info">
                <div className="track-title">{track.filename}</div>
                <div className="track-meta">
                  <span>{track.distance} km</span>
                  <span>{track.duration} hr</span>
                  <span>{track.elevationGain} m</span>
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
