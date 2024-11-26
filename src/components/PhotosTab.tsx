import React from 'react';
import { arweave, arweaveGateway } from '../utils/arweave';
import { TrackPoint } from '../types/TrackPoint';
import '../styles/PhotosTab.css';

interface PhotosTabProps {
  groupId: string;
}
interface Photo {
  artxid: string;
  key: string;
  description: string;

}

export const PhotosTab: React.FC<PhotosTabProps> = ({ groupId }) => {
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [arphotos, setArphotos] = React.useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = React.useState<Photo | null>(null);
  const [currentYear, setCurrentYear] = React.useState<number>(new Date().getFullYear());


  React.useEffect(() => {
    
    loadPhotos();

  }, [groupId, currentYear]);

  const loadPhotos = async () => {

    const query = {
        query: `{
            transactions(
                tags: [
                    { name: "App-Name", values: ["AllTracks"] },
                     { name: "File-Type", values: ["photo"] },
                   

                ],
                block: {
                    min: ${currentYear}
                }
            ) {
                edges {
                    node {
                        id
                        tags {
                            name
                            value
                        }
                    }
                }
            }
        }`
    };

    const response = await arweave.api.post('/graphql', query);
    console.log(response.data);
    const photos = response.data.data.transactions.edges.map(edge => ({
        artxid: edge.node.id,
        key: edge.node.tags.find(t => t.name === 'Original-Name')?.value || '',
        description: edge.node.tags.find(t => t.name === 'Description')?.value || ''
    }));

    setArphotos(photos);
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
            <img src={`${arweaveGateway}/${photo.artxid}`} alt={`Photo ${index + 1}`} />
          </div>
        ))}

      </div>
      {selectedPhoto && (
        <div className="modal-overlay" onClick={() => setSelectedPhoto(null)}>
          <div className="modal-content photo-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="photo-description">{selectedPhoto.description} {selectedPhoto.key}</div>
              <button className="close-button" onClick={() => setSelectedPhoto(null)}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="modal-body">
              <img
                src={`${arweaveGateway}/${selectedPhoto.artxid}`}
                alt={selectedPhoto.key}
                className="full-size-photo"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
