import React, { useState, useEffect } from 'react';
import { arweave, arweaveGateway } from '../utils/arweave';
import { User, setDoc, listDocs } from '@junobuild/core';
import { UploadARForm } from './UploadARForm';
import '../styles/ArStorage.css'
import { useNotification } from '../context/NotificationContext';
import Cookies from 'js-cookie';
import { useGlobalContext, useAlltracks } from './Store';
import { Photo } from '../api/alltracks/backend.did.d'
import { Group } from '../api/alltracks/backend.did.d';

interface UploadFormData {
  trackId: string;
  groupId: string;
  tags: string;
  filename: string;
  date: string;
  photoUrl: string | undefined;
}

export const ArStorage: React.FC = () => {
  const { state: {
    isAuthed, principal
  } } = useGlobalContext();
  const alltracks = useAlltracks();
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [userGroups, setUserGroups] = useState<Group[]>([]);

  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();
  const [wallet, setWallet] = useState<any>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [yearList, setYearList] = useState<number[]>([]);


  useEffect(() => {

    const savedWallet = Cookies.get('arweave_wallet');
    if (savedWallet) {
      setWallet(JSON.parse(savedWallet));
    }
  }, []);


  useEffect(() => {
    loadPhotos();
  }, [isAuthed, currentYear]);

  useEffect(() => {
    loadUserGroups();
  }, [isAuthed]);
  
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
    if (!isAuthed) return;
    setLoading(true);

    const startOfYear = new Date(currentYear, 0, 1).getTime() * 1000000;
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59).getTime() * 1000000;
    const result = await alltracks.getMyPhotos(startOfYear, endOfYear);
    console.log(result);
    setPhotos(result);
    // const result = await listDocs<Photo>({
    //   collection: "photos",
    //   filter: {
    //     owner: user.key,
    //     matcher: {
    //       createdAt: {
    //         matcher: "between",
    //         timestamps: {
    //           start: BigInt(startOfYear),
    //           end: BigInt(endOfYear)
    //         }
    //       }
    //     },
    //     order: {
    //       desc: true,
    //       field: "updated_at"
    //     }
    //   }
    // });
    // setPhotos(result.items.map(item => {
    //   return {
    //     artxid: item.data.artxid,
    //     description: item.description,
    //     key: item.key
    //   }
    // }));

    setLoading(false);
  };
const loadUserGroups = async () => {
  if (!isAuthed) return;
  try {
    const groups = await alltracks.getMyGroups();
    setUserGroups(groups);
  } catch (error) {
    console.error('Error loading groups:', error);
    showNotification('Error loading groups', error.message);
  }
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
    if (!photo.groupId) return false;
    else return photo.groupId[0] === selectedGroupId;
  });


  const handleUpload = async (formData: UploadFormData, file: File) => {
    if (!isAuthed) return;
    setUploading(true);
    var photoUrl = formData.photoUrl;
    try {

      if (file) {

        const fileBuffer = await file.arrayBuffer();
        const transaction = await arweave.createTransaction({
          data: fileBuffer
        });

        transaction.addTag('Content-Type', file.type);
        transaction.addTag('App-Name', 'AllTracks');
        transaction.addTag('User-Key', principal.toText());
        transaction.addTag('Track-ID', formData.trackId);
        transaction.addTag('Group-ID', formData.groupId);
        transaction.addTag('Tags', formData.tags);
        transaction.addTag('File-Type', 'photo');

        if (wallet) {
          await arweave.transactions.sign(transaction, wallet);
        } else {
          await arweave.transactions.sign(transaction);
        }

        const response = await arweave.transactions.post(transaction);

        if (response.status === 200) {
          setTransactionId(transaction.id);
          photoUrl = arweaveGateway + "/" + transaction.id;
        }
      }
      // await setDoc({
      //   collection: "photos",
      //   doc: {
      //     key: `${formData.trackId}_${formData.groupId}_${Date.now()}`,
      //     data: {
      //       artxid: transaction.id,
      //       filename: formData.filename,
      //       contentype: file.type
      //     },
      //     description: formData.tags
      //   }
      // })'
      if (photoUrl) {
        const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        const photo = {
          groupId: [formData.groupId],
          photoUrl: photoUrl,
          tags: tagsArray,
          timestamp: new Date(formData.date).getTime() * 1000000,
          trackId: formData.trackId,
        };
        console.log(photo);
        await alltracks.addPhoto(photo);

        loadPhotos();
      }
      setShowUploadForm(false)
    } catch (error) {
      console.error('Upload error:', error.message);
      showNotification('Upload error:', error.message);
    } finally {
      setUploading(false);
    }
  };
  const uniqueGroupIds = [...new Set(photos.map(photo => photo.groupId ? photo.groupId[0] : ''))];


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
          <div className="modal-backdrop">
            <div className="ar-storage-modal">
              <UploadARForm
                groups={userGroups}
                onSubmit={handleUpload}
                isUploading={uploading}
                onClose={() => setShowUploadForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="photos-list">

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

        {loading ? (
          <div>Loading photos...</div>
        ) : (
          <div className="photo-grid">
            {filteredPhotos.map((photo, i) => {

              return (
                <div key={i} className="photo-item">
                  <img
                    src={photo.photoUrl}
                    alt={photo.tags.toString()}
                  />
                  <div className="photo-info">
                    <h4>{photo.tags.toString()}</h4>
                    <div className="photo-meta">
                      <span>Track: {photo.trackId}</span>,
                      <span>Group: {photo.groupId ? photo.groupId[0] : ''}</span>
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