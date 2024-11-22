import React, { useState, useEffect } from 'react';
import Arweave from 'arweave';
import { User, setDoc, listDocs } from '@junobuild/core';
import { UploadARForm } from './UploadARForm';
import '../styles/ArStorage.css'
import { useNotification } from '../context/NotificationContext';
import Cookies from 'js-cookie';

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
  artxid: string;
  description: string;
  key: string;
}
export const ArStorage: React.FC<ArStorageProps> = ({ user }) => {
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();
  const [wallet, setWallet] = useState<any>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [yearList, setYearList] = useState<number[]>([]);
  const uniqueGroupIds = [...new Set(photos.map(photo => extractIds(photo.key).groupId))];


  useEffect(() => {
    const savedWallet = Cookies.get('arweave_wallet');
    if (savedWallet) {
      setWallet(JSON.parse(savedWallet));
    }
  }, []);

  const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https'
  });

  useEffect(() => {
    loadPhotos();
  }, [user, currentYear, selectedGroupId]);

  // const loadPhotos = async () => {
  //   if (!user) return;
  //   setLoading(true);

  //   const result = await listDocs<Photo>({
  //     collection: "photos",
  //     filter: {
  //       owner: user.key,
  //       order: {
  //         desc: true,
  //         field: "updated_at"
  //       }
  //     }
  //   });


  //   setPhotos(result.items.map(item => {
  //     return {
  //       artxid: item.data.artxid,
  //       description: item.description,
  //       key: item.key
  //     }
  //   }));
  //   setLoading(false);
  // };

  const loadPhotos = async () => {
    if (!user) return;
    setLoading(true);

    const startOfYear = new Date(currentYear, 0, 1).getTime() * 1000000;
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59).getTime() * 1000000;

    const result = await listDocs<Photo>({
      collection: "photos",
      filter: {
        owner: user.key,
        matcher: {
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
          field: "updated_at"
        }
      }
    });
    setPhotos(result.items.map(item => {
          return {
            artxid: item.data.artxid,
            description: item.description,
            key: item.key
          }
        }));

    setLoading(false);
  };

  const extractIds = (key: string) => {
    if (!key) return { trackId: '', groupId: '' };
    const parts = key.split('_');
    return {
      trackId: parts[0] || '',
      groupId: parts[1] || ''
    };
  };  
  
  const filteredPhotos = photos.filter(photo => {
    if (!selectedGroupId) return true;
    const { groupId } = extractIds(photo.key);
    return groupId === selectedGroupId;
  });


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
      // transaction.addTag('User-Key', user.key);
      transaction.addTag('Track-ID', formData.trackId);
      transaction.addTag('Group-ID', formData.groupId);
      transaction.addTag('Tags', formData.tags);
      // transaction.addTag('File-Name', formData.filename);

      await arweave.transactions.sign(transaction, wallet);
      const response = await arweave.transactions.post(transaction);

      if (response.status === 200) {
        setTransactionId(transaction.id);
        await setDoc({
          collection: "photos",
          doc: {
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
      loadPhotos();
      setShowUploadForm(false)
    } catch (error) {
      showNotification('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="ar-storage">
      <div className="ar-storage-header">
        <h2>Photo Gallery</h2>
        <button
          className="upload-trigger-button"
          onClick={() => setShowUploadForm(true)}
        >
          <span className="material-icons">cloud_upload</span>
          Upload
        </button>
      </div>

      {showUploadForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-body">
              <UploadARForm
                onSubmit={handleUpload}
                isUploading={uploading}
                onClose={() => setShowUploadForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="photos-list">
        <h3>My Photos</h3>
        <div className="filter-section">
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="group-filter"
          >
            <option value="">All Groups</option>
            {uniqueGroupIds.map(groupId => (
              <option key={groupId} value={groupId}>Group {groupId}</option>
            ))}
          </select>
        </div>
        <div className="year-navigation">
          <button
            onClick={() => setCurrentYear(prev => prev - 1)}
            className="year-nav-button"
          >
            <span className="material-icons">chevron_left</span>
            {currentYear - 1}
          </button>
          <span className="current-year">{currentYear}</span>
          <button
            onClick={() => setCurrentYear(prev => prev + 1)}
            className="year-nav-button"
            disabled={currentYear === new Date().getFullYear()}
          >
            {currentYear + 1}
            <span className="material-icons">chevron_right</span>
          </button>
        </div>
        {loading ? (
          <div>Loading photos...</div>
        ) : (
          <div className="photo-grid">
            {filteredPhotos.map(photo => {
              const { trackId, groupId } = extractIds(photo.key);
              return (
                <div key={photo.artxid} className="photo-item">
                  <img
                    src={`https://arweave.net/${photo.artxid}`}
                    alt={photo.description}
                  />
                  <div className="photo-info">
                    <h4>{photo.description}</h4>
                    <div className="photo-meta">
                      <span>Track: {trackId}</span>,
                      <span>Group: {groupId}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
};