import React, { useState, useEffect } from 'react';
import Arweave from 'arweave';
import { User, setDoc, listDocs } from '@junobuild/core'; 
import { UploadARForm } from './UploadARForm';

interface ArStorageProps {
  user: User | null;
}

interface UploadFormData {
    trackId: string;
    groupId: string;
    tags: string;
    filename: string;
  }
  interface Photo {
    txId: string;
    trackId: string;
    groupId: string;
    tags: string[];
    filename: string;
    timestamp: number;
  }
export const ArStorage: React.FC<ArStorageProps> = ({ user }) => {
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);

  const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https'
  });

  useEffect(() => {
    loadPhotos();
  }, [user]);

  const loadPhotos = async () => {
    if (!user) return;
    setLoading(true);

    const result = await listDocs<Photo>({
      collection: "photos",
      filter: {
        owner: user.key,       
        order: {
          desc: true,
          field: "updated_at"
        }
      }
    });

    setPhotos(result.items.map(item => item.data));
    setLoading(false);
  };

  const handleUpload = async (formData: UploadFormData, file: File) => {
    if (!user) return;
    setUploading(true);

    try {
      const fileBuffer = await file.arrayBuffer();
      const transaction = await arweave.createTransaction({
        data: fileBuffer
      });

      transaction.addTag('Content-Type', file.type);
      transaction.addTag('App-Name', 'AllTracks');
      transaction.addTag('User-Key', user.key);
      transaction.addTag('Track-ID', formData.trackId);
      transaction.addTag('Group-ID', formData.groupId);
      transaction.addTag('Tags', formData.tags);
      transaction.addTag('File-Name', formData.filename);

      await arweave.transactions.sign(transaction);
      const response = await arweave.transactions.post(transaction);

      if (response.status === 200) {
        setTransactionId(transaction.id);
        await setDoc({
          collection:"photos",
          doc:{
            key: `${formData.trackId}_${formData.groupId}_${Date.now()}`,
            data: {
              artxid: transaction.id, 
              filename: formData.filename,
              contentype: file.type             
            },
            description: formData.tags
          }
        })
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="ar-storage">
      <UploadARForm onSubmit={handleUpload} isUploading={uploading} />
      
      <div className="photos-list">
        <h3>My Photos</h3>
        {loading ? (
          <div>Loading photos...</div>
        ) : (
          <div className="photo-grid">
            {photos.map(photo => (
              <div key={photo.txId} className="photo-item">
                <img 
                  src={`https://arweave.net/${photo.txId}`}
                  alt={photo.filename}
                />
                <div className="photo-info">
                  <p>{photo.filename}</p>
                  <p>Track: {photo.trackId}</p>
                  <p>Group: {photo.groupId}</p>
                  <div className="tags">
                    {photo.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};