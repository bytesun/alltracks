import React, { useState } from 'react';
import './CreateTrail.css';

export interface TrailForm {
    name: string;
    description: string;
    length: number;
    elevationGain: number;
    routeType: 'loop' | 'out-and-back' | 'point-to-point';
    difficulty: 'easy' | 'moderate' | 'hard' | 'expert';
    rating: number;
    tags: string[];
    imageUrl: string;
}

interface CreateTrailProps {
    onClose: () => void;
    onSubmit: (trail: TrailForm, file: File) => void;
}

export const CreateTrail: React.FC<CreateTrailProps> = ({ onClose, onSubmit }) => {
    const [file, setFile] = useState<File | null>(null);
    const [formData, setFormData] = useState<TrailForm>({
        name: '',
        description: '',
        length: 0,
        elevationGain: 0,
        routeType: 'loop',
        difficulty: 'moderate',
        rating: 0,
        tags: [],
        imageUrl: ''

    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Handle form submission
        if (file) {
            onSubmit(formData, file);
        }
        onClose(); // Close modal after submission
    };

    return (
        <div className="create-trail">
            <form onSubmit={handleSubmit}>
                <div className="trail-form-group">
                    <label>Trail Name</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Enter trail name"
                        required
                    />
                </div>

                <div className="trail-form-group">
                    <label>Description</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Describe the trail"
                        rows={4}
                    />
                </div>

                <div className="trail-form-row">
                    <div className="trail-form-group">
                        <label>Length (km)</label>
                        <input
                            type="number"
                            name="length"
                            value={formData.length}
                            onChange={handleInputChange}
                            step="0.1"
                            min="0"
                        />
                    </div>

                    <div className="trail-form-group">
                        <label>Elevation Gain (m)</label>
                        <input
                            type="number"
                            name="elevationGain"
                            value={formData.elevationGain}
                            onChange={handleInputChange}
                            min="0"
                        />
                    </div>
                </div>

                <div className="trail-form-row">
                    <div className="trail-form-group">
                        <label>Route Type</label>
                        <select name="routeType" value={formData.routeType} onChange={handleInputChange}>
                            <option value="loop">Loop</option>
                            <option value="out-and-back">Out and Back</option>
                            <option value="point-to-point">Point to Point</option>
                        </select>
                    </div>

                    <div className="trail-form-group">
                        <label>Difficulty Level</label>
                        <select name="difficulty" value={formData.difficulty} onChange={handleInputChange}>
                            <option value="easy">Easy</option>
                            <option value="moderate">Moderate</option>
                            <option value="hard">Hard</option>
                            <option value="expert">Expert</option>
                        </select>
                    </div>
                </div>
                <div className="trail-form-row">
                    <div className="trail-form-group">
                        <label>Rating</label>
                        <input
                            type="number"
                            name="rating"
                            value={formData.rating}
                            onChange={handleInputChange}
                            min="0"
                            max="5"
                            step="0.5"
                        />
                    </div>
                    <div className="trail-form-group">
                        <label>Tags</label>
                        <input
                            type="text"
                            name="tags"
                            placeholder="Enter tags separated by commas"
                            onChange={(e) => {
                                const tags = e.target.value.split(',').map(tag => tag.trim());
                                setFormData(prev => ({
                                    ...prev,
                                    tags
                                }));
                            }}
                        />
                    </div>
                </div>

                <div className="trail-form-group">
                    <label>Upload Trail File</label>
                    <div className="file-upload">
                        <input
                            type="file"
                            onChange={handleFileChange}
                            accept=".gpx,.kml,.geojson"
                            required
                        />
                        <div className="file-info">
                            {file ? file.name : 'No file selected'}
                        </div>
                    </div>
                </div>
                <div className="trail-form-group">
                    <label>Trail Image URL</label>
                    <input
                        type="text"
                        name="imageUrl"
                        value={formData.imageUrl}
                        onChange={handleInputChange}
                        placeholder="Enter image URL for trail"
                    />
                </div>
                <button type="submit" className="create-trail-button">
                    Create
                </button>
            </form>
        </div>
    );
};