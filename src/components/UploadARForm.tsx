import React, { useState } from 'react';
import Cookies from 'js-cookie';

interface UploadFormProps {
  onSubmit: (formData: UploadFormData, file: File) => void;
  isUploading: boolean;
}

interface UploadFormData {
  trackId: string;
  groupId: string;
  tags: string;
  filename: string;
}

export const UploadARForm: React.FC<UploadFormProps> = ({ onSubmit, isUploading }) => {
  const [file, setFile] = useState<File | null>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [formData, setFormData] = useState<UploadFormData>({
    trackId: '',
    groupId: '',
    tags: '',
    filename: ''
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      onSubmit(formData, file);
      setFile(null);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
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

      <div className="form-group">
        <label>Track ID</label>
        <input
          type="text"
          name="trackId"
          value={formData.trackId}
          onChange={handleInputChange}
          placeholder="Enter track ID"
        />
      </div>

      <div className="form-group">
        <label>Group ID</label>
        <input
          type="text"
          name="groupId"
          value={formData.groupId}
          onChange={handleInputChange}
          placeholder="Enter group ID"
        />
      </div>

      <div className="form-group">
        <label>Tags</label>
        <input
          type="text"
          name="tags"
          value={formData.tags}
          onChange={handleInputChange}
          placeholder="Enter tags (comma separated)"
        />
      </div>

      <div className="form-group">
        <label>File Name</label>
        <input
          type="text"
          name="filename"
          value={formData.filename}
          onChange={handleInputChange}
          placeholder="Enter file name"
        />
      </div>

      <div className="form-group">
        <label>File</label>
        <input
          type="file"
          onChange={handleFileChange}
          className="file-input"
        />
      </div>

      <div className="wallet-section">
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
            Connect Wallet
          </button>
        )}
        <button
          type="submit"
          disabled={!file || isUploading || !wallet}
          className="upload-button"
        >
          {isUploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>


    </form>
  );
};
