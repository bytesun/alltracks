import React, { useState } from 'react';
import './CommentModal.css';

interface CommentModalProps {
  onSave: (data: {
    comment: string;
    cloudEnabled: boolean;
    isIncident: boolean;
    isPrivate: boolean;
  }) => void;
  onClose: () => void;
}

export const CommentModal: React.FC<CommentModalProps> = ({ onSave, onClose }) => {
  const [comment, setComment] = useState('');
  const [showCloudOptions, setShowCloudOptions] = useState(false);
  
  const [enableCloud, setEnableCloud] = useState(false);
  const [reportIncident, setReportIncident] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({comment,
      cloudEnabled: enableCloud,
      isIncident: reportIncident,
      isPrivate: isPrivate
  });
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Add Point Note</h3>
        <form onSubmit={handleSubmit}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Enter your note (optional)"
            rows={4}
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
                  onChange={(e) => {
                    setEnableCloud(e.target.checked);
                    if (!e.target.checked) {
                      setReportIncident(false);
                      setIsPrivate(false);
                    }
                  }}
                />
                Enable Cloud Sync
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
