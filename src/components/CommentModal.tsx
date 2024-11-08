import React, { useState } from 'react';
import './CommentModal.css';
import { User } from "@junobuild/core";
interface CommentModalProps {
  onSave: (data: {
    comment: string;
    cloudEnabled: boolean;
    isIncident: boolean;
    isPrivate: boolean;
    photo: File | undefined; // New field
  }) => void;
  onClose: () => void;
  user: User | null;
}
export const CommentModal: React.FC<CommentModalProps> = ({ onSave, onClose, user }) => {
  const [comment, setComment] = useState('');
  const [showCloudOptions, setShowCloudOptions] = useState(false);

  const [enableCloud, setEnableCloud] = useState(false);
  const [reportIncident, setReportIncident] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  // Add new state
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  // Add handler for photo capture
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      comment,
      cloudEnabled: enableCloud,
      isIncident: reportIncident,
      isPrivate: isPrivate,
      photo: photo || undefined
    });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{
        maxHeight: '80vh',
        overflowY: 'auto',
        paddingRight: '15px'
      }}>
        <h3>Add Point Note</h3>
        <form onSubmit={handleSubmit}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Enter your note (optional)"
            rows={2}
          />

          <div className="cloud-options-header" onClick={() => setShowCloudOptions(!showCloudOptions)}>
            <span className="material-icons">
              {showCloudOptions ? 'expand_less' : 'expand_more'}
            </span>
            Cloud Options
          </div>
          {showCloudOptions && (
            <div className="cloud-options">
              <label>
                <input
                  type="checkbox"
                  checked={enableCloud}
                  disabled={!user}
                  title={!user ? "Please sign in to enable cloud sync" : ""}
                  onChange={(e) => {
                    setEnableCloud(e.target.checked);
                    if (!e.target.checked) {
                      setReportIncident(false);
                      setIsPrivate(false);
                    }
                  }}
                />
                Enable Cloud Sync {!user && "(Sign in required)"}
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={reportIncident}
                  onChange={(e) => setReportIncident(e.target.checked)}
                  disabled={!enableCloud}
                />
                Report Incident/Hazard...
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  disabled={!enableCloud}
                />
                Private Point (storage configured required)
              </label>
              {enableCloud &&
                <div className="photo-capture">
                  <label className={`photo-button ${!enableCloud ? 'disabled' : ''}`}>
                    <span className="material-icons">photo_camera</span>
                    Attach A Photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoCapture}
                      style={{ display: 'none' }}
                      disabled={!enableCloud}
                    />
                  </label>
                  {photoPreview && (
                    <div className="photo-preview">
                      <img src={photoPreview} alt="Captured" />
                      <button
                        type="button"
                        className="remove-photo"
                        onClick={() => {
                          setPhoto(null);
                          setPhotoPreview('');
                        }}
                      >
                        <span className="material-icons">close</span>
                      </button>
                    </div>
                  )}
                </div>
              }

            </div>

          )}
          <div className="modal-buttons">
            <button type="submit">Save</button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};