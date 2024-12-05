import React, { useState } from 'react';
import Cookies from 'js-cookie';

interface UploadFormProps {
  onSubmit: (formData: UploadFormData, file: File) => void;
  onClose: () => void;
  isUploading: boolean;
}

interface UploadFormData {
  trackId: string;
  groupId: string;
  tags: string;
  filename: string;
  date: string;
  photoUrl: string | undefined;
}

export const UploadARForm: React.FC<UploadFormProps> = ({ onClose, onSubmit, isUploading }) => {
  const [file, setFile] = useState<File | null>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [formData, setFormData] = useState<UploadFormData>({
    trackId: '',
    groupId: '',
    tags: '',
    filename: '',
    date: new Date().toISOString().split('T')[0],
    photoUrl: null
  });

  React.useEffect(() => {
    const savedWallet = Cookies.get('arweave_wallet');
    if (savedWallet) {
      setWallet(JSON.parse(savedWallet));
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setFormData(prev => ({
        ...prev,
        filename: e.target.files[0].name
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      onSubmit(formData, file);
    }
  };
  const handleWalletUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    fileReader.onloadend = async (e) => {
      if (e.target?.result) {
        const wallet = JSON.parse(e.target.result as string);
        setWallet(wallet);
        Cookies.set('arweave_wallet', JSON.stringify(wallet), { expires: 7 });
      }
    };
    if (event.target.files?.[0]) {
      fileReader.readAsText(event.target.files[0]);
    }
  };

  const disconnectWallet = () => {
    setWallet(null);
    Cookies.remove('arweave_wallet');
  };
  return (
    <form onSubmit={handleSubmit} className="upload-form">

      <div className="setting-row">
        <div className="setting-label">
          <span className="material-icons">calendar_today</span>
          <span>Date</span>
        </div>
        <div className="setting-control">
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            required
          />
        </div>
      </div>
      <div className="setting-row">
        <div className="setting-label">
          <span className="material-icons">fingerprint</span>
          <span>Track ID</span>
        </div>
        <div className="setting-control">
          <input
            type="text"
            name="trackId"
            value={formData.trackId}
            onChange={handleInputChange}
            placeholder="Enter track ID"

          />
        </div>
      </div>

      <div className="setting-row">
        <div className="setting-label">
          <span className="material-icons">group</span>
          <span>Group ID</span>
        </div>
        <div className="setting-control">
          <input
            type="text"
            name="groupId"
            value={formData.groupId}
            onChange={handleInputChange}
            placeholder="Enter group ID"

          />
        </div>
      </div>

      <div className="setting-row">
        <div className="setting-label">
          <span className="material-icons">label</span>
          <span>Tags</span>
        </div>
        <div className="setting-control">
          <input
            type="text"
            name="tags"
            value={formData.tags}
            onChange={handleInputChange}
            placeholder="Enter tags (comma separated)"

          />
        </div>
      </div>

      <div className="setting-row">
        <div className="setting-label">
          <span className="material-icons">upload_file</span>
          <span>Photo</span>
        </div>
        <div className="setting-control">
          <input
            type="text"
            name="photoUrl"
            value={formData.photoUrl}
            onChange={handleInputChange}
            placeholder="Enter photo URL"
            className="photo-input"
          />
          <div className="input-separator">
            <span>OR</span>
          </div>
          <input
            type="file"
            onChange={handleFileChange}
            className="file-input"
            accept="image/*"
          />
        </div>
      </div>
      <div className="setting-control actions-row">
        {/* <div className="wallet-section">
        <input
          type="file"
          accept=".json"
          onChange={handleWalletUpload}
          style={{ display: 'none' }}
          id="wallet-upload"
        />
        {wallet ? (
          <button
            type="button"
            onClick={disconnectWallet}
            className="wallet-button"
          >
            <span className="material-icons">account_balance_wallet</span>
            Disconnect Wallet
          </button>
        ) : (
          <button
            type="button"
            onClick={() => document.getElementById('wallet-upload')?.click()}
            className="wallet-button"
          >
            <span className="material-icons">account_balance_wallet</span>
            Import Arweavea Wallet
          </button>
        )}

      </div> */}
        <button
          type="submit"
          disabled={(!formData.photoUrl && !file) || isUploading}
          className="upload-button"
        >

          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="cancel-button"
          style={{
            background: '#e9ecef',
            border: '1px solid #ced4da',
            color: '#495057'
          }}
        >

          Cancel
        </button>
      </div>
    </form>
  );
};
