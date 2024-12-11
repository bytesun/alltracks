import React from 'react';
import { Principal } from '@dfinity/principal';
import '../styles/Tracks.css'
import { useGlobalContext } from './Store';
import { useAlltracks } from './Store';
import { parseTracks } from '../utils/trackUtils';
import { Track } from "../api/alltracks/backend.did"
import { Link } from 'react-router-dom';
import { CreateTrackModal } from './CreateTrackModal';
import { arweaveGateway } from '../utils/arweave';

export const Tracks: React.FC<{ userId?: string }> = ({userId}) => {

  const alltracks = useAlltracks();
  const { state: { isAuthed, principal } } = useGlobalContext();
  const [tracks, setTracks] = React.useState<Track[]>([]);
  const [trackVisibility, setTrackVisibility] = React.useState<'public' | 'private'>('public');

  const [showCreateModal, setShowCreateModal] = React.useState(false);

  React.useEffect(() => {
    if (isAuthed) {
      fetchTracks();
    }
  }, [isAuthed, trackVisibility]);


  const fetchTracks = async () => {

    const tks = await alltracks.getTracks({ user: Principal.fromText(userId) })
    console.log(tks)
    const formattedTracks = parseTracks(tks);
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

    <div className="tracks-grid">
      {tracks.map((track) => (
        <Link to={`/track/${track.id}`} key={track.startime} className="track-card">
          <div className="track-icon">
            <span className="material-icons">route</span>
          </div>
          <div className="track-content">
            <div className="track-title">
              <h3>{track.name}</h3>
              <span className="track-date">{new Date(Number(track.startime)).toLocaleDateString()}</span>
            </div>
            <div className="track-stats">
              <div className="stat">
                <span className="material-icons">straighten</span>
                <span>{track.length.toFixed(1)} km</span>
              </div>
              <div className="stat">
                <span className="material-icons">schedule</span>
                <span>{track.duration.toFixed(1)} hr</span>
              </div>
              <div className="stat">
                <span className="material-icons">terrain</span>
                <span>{track.elevation.toFixed(0)} m</span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
    {showCreateModal && (
      <CreateTrackModal
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => fetchTracks()}
      />
    )}
  </div>
);
}
