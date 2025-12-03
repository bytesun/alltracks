import React, { useState, useEffect } from 'react';
import { useAlltracks } from './Store';
import { useNotification } from '../context/NotificationContext';
import { ActivityType } from '../types/Trackathon';
import '../styles/CreateTrackathonModal.css';

interface CreateTrackathonModalProps {
  onClose: () => void;
  onCreate: (data: {
    name: string;
    description: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    activityType: ActivityType;
    groupId?: string;
  }) => void;
}

export const CreateTrackathonModal: React.FC<CreateTrackathonModalProps> = ({
  onClose,
  onCreate,
}) => {
  const alltracks = useAlltracks();
  const { showNotification } = useNotification();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    duration: 24,
    activityType: 'hiking' as ActivityType,
    groupId: '',
  });
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    // Load user's groups
    alltracks.getMyGroups().then((data) => {
      setGroups(data.map(g => ({ id: g.id, name: g.name })));
    });

    // Set default start time - tomorrow at 8am
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);

    // Set default end time - tomorrow at 8am + 24 hours (default duration)
    const endDate = new Date(tomorrow);
    endDate.setHours(endDate.getHours() + 24);

    setFormData(prev => ({
      ...prev,
      startDate: tomorrow.toISOString().split('T')[0],
      startTime: '08:00',
      endDate: endDate.toISOString().split('T')[0],
      endTime: endDate.toTimeString().split(' ')[0].substring(0, 5),
    }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const startTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endTime = new Date(`${formData.endDate}T${formData.endTime}`);

    if (startTime < new Date()) {
      showNotification('Start time must be in the future', 'error');
      return;
    }

    if (endTime <= startTime) {
      showNotification('End time must be after start time', 'error');
      return;
    }

    if (formData.duration < 1 || formData.duration > 168) {
      showNotification('Duration must be between 1 and 168 hours (7 days)', 'error');
      return;
    }

    setIsCreating(true);
    onCreate({
      name: formData.name,
      description: formData.description,
      startTime,
      endTime,
      duration: formData.duration,
      activityType: formData.activityType,
      groupId: formData.groupId || undefined,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content trackathon-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Trackathon</h2>
          <button className="close-button" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              <span className="material-icons">title</span>
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Spring Mountain Challenge"
              required
            />
          </div>

          <div className="form-group">
            <label>
              <span className="material-icons">description</span>
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the trackathon... e.g., 'Join anytime this weekend! Once you start, you have 24 hours to complete the challenge.'"
              rows={4}
              required
            />
          </div>

          <div className="form-group">
            <label>
              <span className="material-icons">directions</span>
              Activity Type *
            </label>
            <select
              value={formData.activityType}
              onChange={(e) => setFormData({ ...formData, activityType: e.target.value as ActivityType })}
              required
            >
              <option value="hiking">Hiking</option>
              <option value="running">Running</option>
              <option value="cycling">Cycling</option>
              <option value="rowing">Rowing</option>
              <option value="other">Other / Mixed</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                <span className="material-icons">event</span>
                Join Window Start *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>
                <span className="material-icons">schedule</span>
                Start Time *
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                <span className="material-icons">event</span>
                End Date *
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>
                <span className="material-icons">schedule</span>
                End Time *
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              <span className="material-icons">timer</span>
              Duration (hours) * - Reference duration for the challenge
            </label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 1 })}
              min="1"
              max="168"
              placeholder="e.g., 24"
              required
            />
            <small className="helper-text">Enter hours between 1 and 168 (7 days)</small>
          </div>

          <div className="form-group">
            <label>
              <span className="material-icons">group</span>
              Group (Optional)
            </label>
            <select
              value={formData.groupId}
              onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
            >
              <option value="">No group - Open to all</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-button" onClick={onClose} disabled={isCreating}>
              Cancel
            </button>
            <button type="submit" className="submit-button" disabled={isCreating}>
              {isCreating ? (
                <>
                  <span className="spinner"></span>
                  Creating...
                </>
              ) : (
                <>
                  <span className="material-icons">add</span>
                  Create Trackathon
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
