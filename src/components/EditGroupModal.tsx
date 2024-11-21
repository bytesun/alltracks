import React, { useState } from 'react';
import '../styles/Group.css';
import { Group } from '../types/Group';

interface EditGroupModalProps {
  group: Group;
  onClose: () => void;
  onSubmit: (groupData: Group) => void;
}

export const EditGroupModal: React.FC<EditGroupModalProps> = ({
  group,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState<Group>({...group});
  const [isUpdating, setIsUpdating] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    await onSubmit(formData);
    setIsUpdating(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">

        <form onSubmit={handleSubmit} className="edit-form">
        <div className="setting-row">
            <div className="setting-label">
              <span className="material-icons">calendar_today</span>
              <span> ID</span>
            </div>
            <div className="setting-control">
              <input
                type="text"
                name="calendarId"
                value={formData.calendarId}
                disabled
              />
            </div>
          </div>
          <div className="setting-row">
            <div className="setting-label">
              <span className="material-icons">group</span>
              <span>Group Name</span>
            </div>
            <div className="setting-control">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-label">
              <span className="material-icons">description</span>
              <span>Description</span>
            </div>
            <div className="setting-control">
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
              />
            </div>
          </div>



          <div className="setting-row">
            <div className="setting-label">
              <span className="material-icons">image</span>
              <span>Badge URL</span>
            </div>
            <div className="setting-control">
              <input
                type="text"
                name="groupBadge"
                value={formData.groupBadge}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="setting-row">
            <div className="setting-control actions-row">

              <button 
                type="submit" 
                className="submit-button"
                disabled={isUpdating}
              >

                {isUpdating ? 'Saving...' : 'Save'}
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
          </div>
        </form>
      </div>
    </div>
  );
};