import React, { useState } from 'react';

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
  const [formData, setFormData] = useState<UploadFormData>({
    trackId: '',
    groupId: '',
    tags: '',
    filename: ''
  });

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
    }
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

      <button 
        type="submit"
        disabled={!file || isUploading}
        className="upload-button"
      >
        {isUploading ? 'Uploading...' : 'Upload'}
      </button>
    </form>
  );
};
