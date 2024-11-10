import React from 'react';
import { User, listDocs } from "@junobuild/core";
import './Tracks.css';

interface Track {
  id: string;
  name: string;
  distance: number;
  duration: number;
  elevationGain: number;
  date: string;
}

export const Tracks: React.FC<{ user: User | null }> = ({ user }) => {
  const [tracks, setTracks] = React.useState<Track[]>([]);

  React.useEffect(() => {
    const loadTracks = async () => {
      if (user?.key) {
        await listDocs({
          collection: "tracks",
          filter: {           
            owner: user.key,
          }
          
        }).then((docs) => {
          setTracks(docs.items.map((doc) => ({
            id: doc.key,
            name: doc.data.filename,
            distance: doc.data.distance,
            duration: doc.data.duration,
            elevationGain: doc.data.elevationGain,
            date: doc.data.startime,
          })));
        });
      }
    };

    loadTracks();
  }, [user]);

  return (
    <div className="tracks-section">
      <div className="settings-header">
        <h3>My Tracks</h3>
      </div>
      
      <div className="tracks-list">
        {tracks.length > 0 ? (
          tracks.map((track) => (
            <div key={track.id} className="track-item">
              <span className="material-icons">route</span>
              <div className="track-info">
                <div className="track-title">{track.name}</div>
                <div className="track-meta">
                  <span>{track.distance} km</span>
                  <span>{track.duration} hr</span>
                  <span>{track.elevationGain} m</span>
                  <span>{track.date}</span>
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
