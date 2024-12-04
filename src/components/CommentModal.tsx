import React, { useState } from 'react';
import './CommentModal.css';
import { useGlobalContext } from './Store';
interface CommentModalProps {
  onSave: (data: {
    comment: string;
    category: string;
    cloudEnabled: boolean;
    isIncident: boolean;
    isPrivate: boolean;
    photo: File | undefined; // New field
  }) => void;
  onClose: () => void;
}
export const CommentModal: React.FC<CommentModalProps> = ({ onSave, onClose }) => {

  const { state: {
    isAuthed, principal
  } } = useGlobalContext();
  const [comment, setComment] = useState('');
  const [showCloudOptions, setShowCloudOptions] = useState(false);

  const [enableCloud, setEnableCloud] = useState(false);
  const [reportIncident, setReportIncident] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  // Add new state
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  const [category, setCategory] = useState(null);
  const categories = ['view', 'scenic', 'rest', 'water', 'camp'];


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
      category,
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
        <h3>Record a point</h3>
        <form onSubmit={handleSubmit}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Enter your inscription  (optional)"
            rows={2}
          />

          <div className="category-selector">
            <div className="category-tags">
              {categories.map((cat) => (
                <div
                  key={cat}
                  className={`category-tag ${category === cat ? 'selected' : ''}`}
                  onClick={() => setCategory(cat)}
                >{cat.charAt(0).toUpperCase() + cat.slice(1)}
                </div>
              ))}
            </div>
          </div>

          <div className="photo-capture">
            <label className={`photo-button ${!enableCloud ? 'disabled' : ''}`}>
              <span className="material-icons">photo_camera</span>
              Take A Photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                style={{ display: 'none' }}
              // disabled={!enableCloud}
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
                  disabled={!isAuthed}
                  title={!isAuthed ? "Please sign in to enable cloud sync" : ""}
                  onChange={(e) => {
                    setEnableCloud(e.target.checked);
                    if (!e.target.checked) {
                      setReportIncident(false);
                      setIsPrivate(false);
                    }
                  }}
                />
                Enable Cloud Sync {!isAuthed && "(Sign in required)"}
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
                Private Point
              </label>

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