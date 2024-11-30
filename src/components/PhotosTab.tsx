import React from 'react';
import { arweave, arweaveGateway } from '../utils/arweave';
import { TrackPoint } from '../types/TrackPoint';
import '../styles/PhotosTab.css';
import { useAlltracks } from './Store';
import { Photo } from '../api/alltracks/backend.did';

interface PhotosTabProps {
  groupId: string;
}


export const PhotosTab: React.FC<PhotosTabProps> = ({ groupId }) => {

  const alltracks = useAlltracks();
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [arphotos, setArphotos] = React.useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = React.useState<Photo | null>(null);
  const [currentYear, setCurrentYear] = React.useState<number>(new Date().getFullYear());


  React.useEffect(() => {

    loadPhotos();

  }, [groupId, currentYear]);

  const loadPhotos = async () => {

    // const query = {
    //   query: `{
    //         transactions(
    //             tags: [
    //                 { name: "App-Name", values: ["AllTracks"] },
    //               { name: "Group-ID", values: ["${groupId}"] },
    //             ],
    //         first: 50
    //         ) {
    //             edges {
    //                 node {
    //                     id
    //                     tags {
    //                         name
    //                         value
    //                     }
    //                 }
    //             }
    //         }
    //     }`
    // };

    // const response = await arweave.api.post('/graphql', query);
    // console.log(response.data);
    // const photos = response.data.data.transactions.edges.map(edge => ({
    //   artxid: edge.node.id,
    //   key: edge.node.tags.find(t => t.name === 'Original-Name')?.value || '',
    //   description: edge.node.tags.find(t => t.name === 'Description')?.value || ''
    // }));
    const start  = BigInt(new Date(currentYear, 0, 1).getTime() * 1000000);
    const end = BigInt(new Date(currentYear, 11, 31, 23, 59, 59).getTime() * 1000000);
    const result = await alltracks.getGroupPhotos(groupId, start, end);

    console.log(result);
    setArphotos(result);
  };

  return (
    <div className="photos-container">
      <div className="filters-row">
        <div className="year-navigation">
          <button
            onClick={() => setCurrentYear(prev => prev - 1)}
            className="year-nav-button"
          >
            <span className="material-icons">chevron_left</span>
          </button>
          <span className="current-year">{currentYear}</span>
          <button
            onClick={() => setCurrentYear(prev => prev + 1)}
            className="year-nav-button"
            disabled={currentYear === new Date().getFullYear()}
          >
            <span className="material-icons">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="photos-grid">
        {arphotos.map((photo, index) => (
          <div key={index} className="photo-item" onClick={() => setSelectedPhoto(photo)}>
            <img src={`${photo.photoUrl}`} alt={`Photo ${index + 1}`} />
            <div className="photo-description"> {photo.trackId} {photo.tags.toString()}  on  {new Date(Number(photo.timestamp)/1000000).toLocaleDateString()}</div>
          </div>
        ))}

      </div>
      {selectedPhoto && (
        <div className="modal-overlay" onClick={() => setSelectedPhoto(null)}>
          <div className="modal-content photo-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              
              <button className="close-button" onClick={() => setSelectedPhoto(null)}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="modal-body">
              <img
                src={`${selectedPhoto.photoUrl}`}
                alt={selectedPhoto.trackId}
                className="full-size-photo"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
