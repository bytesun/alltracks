import React, { useState, useEffect } from 'react';
import { User, setDoc, listDocs, uploadFile } from "@junobuild/core";
import { CreateTrail } from './CreateTrail';
import './Trails.css';
import { TrailForm } from './CreateTrail';
import { v4 as uuidv4 } from 'uuid';

interface Trail {
    id: string;
    name: string;
    description: string;
    length: number;
    elevationGain: number;
    routeType: 'loop' | 'out-and-back' | 'point-to-point';
    difficulty: 'easy' | 'moderate' | 'hard' | 'expert';
    rating: number;
    tags: string[];
    userId: string;
    fileRef: string;
    imageUrl: string;
}

export const Trails: React.FC<{ user: User | null }> = ({ user }) => {
    const [trails, setTrails] = React.useState<Trail[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    useEffect(() => {
        loadTrails();
    }, []);
    const handleTrailSubmit = async (trailData: TrailForm, file: File) => {
        setIsLoading(true);
        try {

            const fileUpload = await uploadFile({
                collection: "trails",
                data: file,
            });
            const id = uuidv4();
            const trailDoc: Trail = {
                ...trailData,
                id,
                userId: user?.key || '',
                fileRef: fileUpload.downloadUrl
            };
            await setDoc({
                collection: "trails",
                doc: {
                    key: id,
                    data: trailDoc,
                    description:`${trailData.name} ${trailData.description} ${trailData.tags}`
                }
            });

            loadTrails(); // Refresh the list
            setShowCreateModal(false);
        } catch (error) {
            console.error('Error saving trail:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadTrails = async () => {
        setIsLoading(true);
        try {
            // Add your trail loading logic here
            const response = await listDocs({
                collection: "trails",
                filter: {
                    owner: user?.key
                }
            });
            setTrails(response.items.map(item => item.data as Trail));
        } catch (error) {
            console.error('Error loading trails:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="trails-section">
            {isLoading && (
                <div className="loading-spinner">
                    <span className="material-icons spinning">refresh</span>
                </div>
            )}
            <div className="settings-header">
                <h3>My Trails</h3>
                <button
                    className="create-trail-button"
                    onClick={() => setShowCreateModal(true)}
                >
                    <span className="material-icons">add</span>
                    Create New Trail
                </button>
            </div>

            <div className="trails-list">
                {trails.length > 0 ? (
                    trails.map((trail) => (
                        <div key={trail.id} className="trail-item">
                            <div className="trail-info">
                                <div className="trail-title">{trail.name}</div>
                                <div className="trail-meta">
                                    <span>{trail.length} km</span>
                                    <span>{trail.difficulty}</span>
                                    <span>{trail.rating}/5</span>
                                </div>
                            </div>
                            {/* <div className="trail-actions">
                                <button className="trail-button edit">
                                    <span className="material-icons">edit</span>

                                </button>
                                <button className="trail-button delete">
                                    <span className="material-icons">delete</span>

                                </button>
                            </div> */}
                        </div>
                    ))
                ) : (
                    <div className="empty-trails">
                        <span className="material-icons">hiking</span>
                        <p>No trails created yet. Start by creating your first trail!</p>
                    </div>
                )}
            </div>

            {showCreateModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Create New Trail</h3>
                            <button
                                className="close-button"
                                onClick={() => setShowCreateModal(false)}
                            >
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        <CreateTrail onClose={() => setShowCreateModal(false)} onSubmit={handleTrailSubmit} />
                    </div>
                </div>
            )}
        </div>
    );
};
