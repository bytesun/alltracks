import React from 'react';

import './Tracks.css';
import { useStats } from '../context/StatsContext';
import { useGlobalContext } from './Store';
import { useAlltracks } from './Store';
import { parseTracks } from '../utils/trackUtils';
import { Track } from "../api/alltracks/backend.did"
import { Link } from 'react-router-dom';
import { CreateTrackModal } from './CreateTrackModal';
import { arweaveGateway } from '../utils/arweave';

export const Tracks: React.FC = () => {

  const alltracks = useAlltracks();
  const { state: { isAuthed, principal } } = useGlobalContext();
  const [tracks, setTracks] = React.useState<Track[]>([]);
  const [trackVisibility, setTrackVisibility] = React.useState<'public' | 'private'>('public');
  const { settings } = useStats();
  const [showCreateModal, setShowCreateModal] = React.useState(false);

  React.useEffect(() => {
    if (isAuthed) {
      fetchTracks();
    }
  }, [isAuthed, trackVisibility]);


  const fetchTracks = async () => {

    const tks = await alltracks.getTracks({ user: principal })
    console.log(tks)
    const formattedTracks = parseTracks(tks);
    console.log(formattedTracks)
    setTracks(formattedTracks);
  };

  // const fetchTracks = async () => {
  //   // Query Arweave for tracks
  //   const query = {
  //     query: `
  //       query {
  //         transactions(
  //           tags: [
  //             {name: "App-Name", values: ["AllTracks"]},
  //             {name: "File-Type", values: ["track"]},
  //             {name: "User-Key", values: ["${principal.toText()}"]}
  //           ]
  //         ) {
  //           edges {
  //             node {
  //               id
  //               tags {
  //                 name
  //                 value
  //               }
  //             }
  //           }
  //         }
  //       }
  //     `
  //   };
  
  //   const response = await fetch('https://arweave.net/graphql', {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify(query)
  //   });
  
  //   const result = await response.json();
  //   const trackTransactions = result.data.transactions.edges;
  //   console.log(trackTransactions);
  //   // Process and format tracks
  //   const formattedTracks = await Promise.all(trackTransactions.map(async (edge) => {
  //     const trackData = await fetch(`${arweaveGateway}/${edge.node.id}`).then(res => res.json());
  //     const tags = edge.node.tags.reduce((acc, tag) => ({...acc, [tag.name]: tag.value}), {});
      
  //     return {
  //       id: edge.node.id,
  //       name: tags['Track-Name'] || 'Unnamed Track',
  //       startime: tags['Start-Time'],
  //       length: trackData.distance || 0,
  //       duration: trackData.duration || 0,
  //       elevation: trackData.elevation || 0
  //     };
  //   }));
  
  //   setTracks(formattedTracks);
  // };
  
  return (
    <div className="tracks-section">
      <div className="settings-header">
        <h3>My Tracks</h3>
        {/* <button 
    className="add-track-button"
    onClick={() => setShowCreateModal(true)}
  >
    <span className="material-icons">add</span>
    New Track
  </button> */}
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
      {showCreateModal && (
        <CreateTrackModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => fetchTracks()}
        />
      )}
    </div>
  );
};
