import React from 'react';
import {Doc, listDocs, listAssets } from '@junobuild/core';
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

  React.useEffect(() => {
    const fetchPhotos = async () => {
      const photoItems = await listAssets({
        collection: "photos",
        filter: {
          matcher: {
            key: `.*_${groupId}_.*`,
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
  }, [groupId]);

  React.useEffect(() => {
    const fetchPhotos = async () => {
      const photoItems = await listDocs<Photo>({
        collection: "photos",
        filter: {
          matcher: {
            key: `.*_${groupId}_.*`,
          },
          order: {
            desc: true,
            field: "created_at"
          }
        }
      });

      const photos = photoItems.items
        .map(doc => {
          return {
            artxid: doc.data.artxid,
            key: doc.key,
            description: doc.description
          };
        });
        
      setArphotos(photos);
    };

    fetchPhotos();
  }, [groupId]);

  return (
    <div className="photos-grid">
      {arphotos.map((photo, index) => (
        <div key={index} className="photo-item" onClick={() => setSelectedPhoto(photo)}>
          <img src={`https://arweave.net/${photo.artxid}`} alt={`Photo ${index + 1}`} />
        </div>
      ))}
      {photos.map((photo, index) => (
        <div key={index} className="photo-item">
          <img src={photo} alt={`Photo ${index + 1}`} />
        </div>
      ))}
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
