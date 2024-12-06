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


            <button
                type="submit"
                className="submit-button"
                disabled={isSubmitting}
            >
                {isSubmitting && (
                    <span className="material-icons spinning">refresh</span>
                ) }
                {isSubmitting ? 'Creating...' : 'Create '}
            </button>

        </form>
    );
};