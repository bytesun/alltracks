import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { setDoc } from "@junobuild/core";
import './CreateEventModal.css';
interface CreateEventModalProps {
    onClose: () => void;
    onSubmit: (formData: any) => Promise<void>;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({ onClose, onSubmit }) => {
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(formData);
        onClose();
    };
    const [formData, setFormData] = useState({
        title: '',
        id: uuidv4(),
        description: '',
        date: '',
        time: '',
        location: '',
        participants: 0,
        maxParticipants: 0,
        imageUrl: '',
        trail: ''
    });

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Create New Event</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Event Title"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                    <textarea
                        placeholder="Description"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                    <input
                        type="datetime-local"
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                    />
                    <input
                        type="text"
                        placeholder="Trail Name"
                        value={formData.trail}
                        onChange={e => setFormData({ ...formData, trail: e.target.value })}
                    />
                    <div className="modal-buttons">
                        <button type="submit">Create</button>
                        <button type="button" onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};
