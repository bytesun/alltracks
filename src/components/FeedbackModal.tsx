import React, { useState } from 'react';
import { setDoc, User } from "@junobuild/core";
import "../styles/FeedbackModal.css";

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
}

export const FeedbackModal = ({ isOpen, onClose, user }: FeedbackModalProps) => {
    const [feedback, setFeedback] = useState({
        message: '',
        type: 'general'
    });

    const handleSubmit = async () => {
        await setDoc({
            satellite: { satelliteId: "ruc7a-fiaaa-aaaal-ab4ha-cai" },
            collection: "inbox",
            doc: {
                key: crypto.randomUUID(),
                data: {
                    ...feedback,
                    userId: user?.key,
                    createdAt: Date.now()
                }
            }
        });
        setFeedback({ message: '', type: 'general' });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Share Your Feedback</h2>
                    <button className="close-button" onClick={onClose}>
                        <span className="material-icons">close</span>
                    </button>
                </div>
                <div className="feedback-form">
                    <select
                        value={feedback.type}
                        onChange={(e) => setFeedback({ ...feedback, type: e.target.value })}
                    >
                        <option value="general">General Feedback</option>
                        <option value="feature">Feature Request</option>
                        <option value="bug">Bug Report</option>
                    </select>
                    <textarea
                        value={feedback.message}
                        onChange={(e) => setFeedback({ ...feedback, message: e.target.value })}
                        placeholder="Tell us your thoughts..."
                    />
                    <button onClick={handleSubmit}>Submit Feedback</button>
                </div>
            </div>
        </div>
    );
};
