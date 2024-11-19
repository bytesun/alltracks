import React from 'react';
import { listDocs, listAssets } from '@junobuild/core';
import { TrackPoint } from '../types/TrackPoint';
import '../styles/PhotosTab.css';

interface PhotosTabProps {
  groupId: string;
}

export const PhotosTab: React.FC<PhotosTabProps> = ({ groupId }) => {
  const [photos, setPhotos] = React.useState<string[]>([]);

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

  return (
    <div className="photos-grid">
      {photos.map((photo, index) => (
        <div key={index} className="photo-item">
          <img src={photo} alt={`Photo ${index + 1}`} />
          
        </div>
      ))}
    </div>
  );
};
