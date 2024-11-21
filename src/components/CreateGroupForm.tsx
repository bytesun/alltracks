import React, { useState } from 'react';
import { Group } from '../types/Group';
interface CreateGroupFormProps {
  onSubmit: (data: Group) => void;
  onClose: () => void;
}

export const CreateGroupForm = ({ onSubmit, onClose }: CreateGroupFormProps) => {
    const [formData, setFormData] = useState<Group>({
        name: '',
        description: '',
        calendarId: '',
        members: [],
        groupBadge: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await onSubmit(formData);
        setIsSubmitting(false);
    };

    return (
        <form className="edit-form" onSubmit={handleSubmit}>
            <div className="form-field">
                <label>Group ID</label>
                <input
                    type="text"
                    value={formData.calendarId}
                    onChange={e => setFormData({ ...formData, calendarId: e.target.value })}
                    required
                />
            </div>
            <div className="form-field">
                <label>Group Name</label>
                <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                />
            </div>
            <div className="form-field">
                <label>Description</label>
                <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    required
                />
            </div>

            <div className="form-field">
                <label>Group Badge URL</label>
                <input
                    type="text"
                    value={formData.groupBadge}
                    onChange={e => setFormData({ ...formData, groupBadge: e.target.value })}
                    placeholder="Enter badge image URL"
                />
            </div>

            <div className="setting-row">
                <div className="setting-control actions-row">
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
                        <span className="material-icons">close</span>
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        className="submit-button"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <span className="material-icons spinning">refresh</span>
                        ) : (
                            <span className="material-icons">add</span>
                        )}
                        {isSubmitting ? 'Creating...' : 'Create Group'}
                    </button>
                </div>
            </div>
        </form>
    );
};