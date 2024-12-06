import React, { useState } from 'react';
import { setDoc, User } from "@junobuild/core";
import "../styles/FeedbackModal.css";

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: String | null;
    showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  }
export const FeedbackModal = ({ isOpen, onClose, user ,showNotification }: FeedbackModalProps) => {
    const [feedback, setFeedback] = useState({
        message: '',
        type: 'general'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        await setDoc({
            satellite: { satelliteId: "ruc7a-fiaaa-aaaal-ab4ha-cai" },
            collection: "inbox",
            doc: {
                key: crypto.randomUUID(),
                data: {
                    ...feedback,
                    userId: user,
                    createdAt: Date.now()
                }
            }
        });
        showNotification('Thank you for your feedback!', 'success');
        setFeedback({ message: '', type: 'general' });
        setIsSubmitting(false);
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
                      <button className='feedback-submit' disabled={isSubmitting} onClick={handleSubmit}>
                        {isSubmitting ? (
                          <span className="material-icons spinning">refresh</span>
                        ) : (
                          'Submit Feedback'
                        )}
                      </button>
                  </div>
              </div>
        </div>
    );
};
