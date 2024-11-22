import React from 'react';
import { Doc, listDocs, listAssets } from '@junobuild/core';
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
    
    const fetchPhotos = async () => {
      const startOfYear = new Date(currentYear, 0, 1).getTime() * 1000000;
      const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59).getTime() * 1000000;
  
      const photoItems = await listAssets({
        collection: "photos",
        filter: {
          matcher: {
            key: `.*_${groupId}_.*`,
            createdAt: {
              matcher: "between",
              timestamps: {
                start: BigInt(startOfYear),
                end: BigInt(endOfYear)
              }
            }
          },
          order: {
            desc: true,
            field: "created_at"
          }
        }
      });

      const photos = photoItems.items
        .map(asset => asset.downloadUrl);

      setPhotos(photos);
    };

    fetchPhotos();
  }, [groupId, currentYear]);

  React.useEffect(() => {
    // const fetchPhotos = async () => {
    //   const photoItems = await listDocs<Photo>({
    //     collection: "photos",
    //     filter: {
    //       matcher: {
    //         key: `.*_${groupId}_.*`,
    //       },
    //       order: {
    //         desc: true,
    //         field: "created_at"
    //       }
    //     }
    //   });

    //   const photos = photoItems.items
    //     .map(doc => {
    //       return {
    //         artxid: doc.data.artxid,
    //         key: doc.key,
    //         description: doc.description
    //       };
    //     });

    //   setArphotos(photos);
    // };

    loadPhotos();

  }, [groupId, currentYear]);

  const loadPhotos = async () => {
    const startOfYear = new Date(currentYear, 0, 1).getTime() * 1000000;
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59).getTime() * 1000000;

    const photoItems = await listDocs<Photo>({
      collection: "photos",
      filter: {
        matcher: {
          key: `.*_${groupId}_.*`,
          createdAt: {
            matcher: "between",
            timestamps: {
              start: BigInt(startOfYear),
              end: BigInt(endOfYear)
            }
          }
        },
        order: {
          desc: true,
          field: "created_at"
        }
      }
    });

    const photos = photoItems.items.map(doc => ({
      artxid: doc.data.artxid,
      key: doc.key,
      description: doc.description
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
            <img src={`https://arweave.net/${photo.artxid}`} alt={`Photo ${index + 1}`} />
          </div>
        ))}
        {photos.map((photo, index) => (
          <div key={index} className="photo-item" >
            <img src={photo} alt={`Photo ${index + 1}`} />
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
                src={`https://arweave.net/${selectedPhoto.artxid}`}
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
