import React, { useState } from 'react';

interface GroupFormData {
    name: string;
    description: string;
    calendarId: string;
    groupBadge: string;
}

export const CreateGroupForm = ({ onSubmit }: { onSubmit: (data: GroupFormData) => void }) => {
    const [formData, setFormData] = useState<GroupFormData>({
        name: '',
        description: '',
        calendarId: '0',
        groupBadge: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form className="group-form" onSubmit={handleSubmit}>
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
                <label>ICEvent Calendar ID</label>
                <input
                    type="text"
                    value={formData.calendarId}
                    onChange={e => setFormData({ ...formData, calendarId: e.target.value })}
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

            <div className="group-actions">
                <button type="submit" className="create-group-btn">
                    <span className="material-icons">add</span>
                    Create Group
                </button>
            </div>
        </form>
    );
};
