import React, { useState } from 'react';
import { setDoc, User } from "@junobuild/core";
import "../styles/FeedbackModal.css";
import { useICEvent } from './Store';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: String | null;
    showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
}
export const FeedbackModal = ({ isOpen, onClose, user, showNotification }: FeedbackModalProps) => {
    const [feedback, setFeedback] = useState({
        message: '',
        type: 'general'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const icevent = useICEvent();

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            // await setDoc({
            //     satellite: { satelliteId: "ruc7a-fiaaa-aaaal-ab4ha-cai" },
            //     collection: "inbox",
            //     doc: {
            //         key: crypto.randomUUID(),
            //         data: {
            //             ...feedback,
            //             userId: user,
            //             createdAt: Date.now()
            //         }
            //     }
            // });
            // Call addSystemTodo for user feedback
            let res = await icevent.addSystemTodo({
                desc: feedback.message,
                duedate: BigInt(Date.now() + 7 * 24 * 60 * 60 * 1000), // one week later
                itodo: feedback.type,
                attachments: []
            });
            if ('err' in res) {
                showNotification(res.err, 'error');
                setIsSubmitting(false);
                return;
            }
            showNotification('Thank you for your feedback!', 'success');
            setFeedback({ message: '', type: 'general' });
        } catch (e) {
            showNotification('Failed to submit feedback.', 'error');
        }
        setIsSubmitting(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">

            <div className="modal-content">

                <div className="feedback-form">
                    <button className="close-button" onClick={onClose}>
                        <span className="material-icons">close</span>
                    </button>
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
                    <button className='feedback-submit' disabled={isSubmitting || !user} onClick={handleSubmit}>
                        {isSubmitting ? (
                            <span className="material-icons spinning">refresh</span>
                        ) : (
                            'Submit'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
