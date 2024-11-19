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
        <h2>Edit Group</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Group Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
            />
          </div>

          <div className="form-group">
            <label>Calendar ID</label>
            <input
              type="text"
              name="calendarId"
              value={formData.calendarId}
              onChange={handleInputChange}
              required
              disabled
            />
          </div>

          <div className="form-group">
            <label>Group Badge</label>
            <input
              type="text"
              name="groupBadge"
              value={formData.groupBadge}
              onChange={handleInputChange}
            />
          </div>

          <div className="modal-buttons">
            <button 
              type="submit" 
              disabled={isUpdating}
            >
              {isUpdating ? (
                <span className="material-icons spinning">refresh</span>
              ) : 'Update Group'}
            </button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};
