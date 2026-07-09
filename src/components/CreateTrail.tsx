import React, { useState } from 'react';
import './CreateTrail.css';

export interface TrailForm {
    name: string;
    description: string;
    length: number;
    elevationGain: number;
    duration: number;
    routeType: 'loop' | 'out-and-back' | 'point-to-point';
    difficulty: 'easy' | 'moderate' | 'hard' | 'expert';
    rating: number;
    tags: string[];
    imageUrl: string;

}

interface CreateTrailProps {
    onClose: () => void;
    onSubmit: (trail: TrailForm, file: File | null) => Promise<void> | void;
    initialValues?: TrailForm;
    submitLabel?: string;
    existingFileLabel?: string;
    requireFile?: boolean;
}

const defaultFormData: TrailForm = {
    name: '',
    description: '',
    length: 0,
    elevationGain: 0,
    duration: 0,
    routeType: 'loop',
    difficulty: 'moderate',
    rating: 0,
    tags: [],
    imageUrl: ''
};

export const CreateTrail: React.FC<CreateTrailProps> = ({
    onClose,
    onSubmit,
    initialValues,
    submitLabel = 'Create',
    existingFileLabel,
    requireFile = true
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [tagsInput, setTagsInput] = useState((initialValues?.tags || []).join(', '));
    const [formData, setFormData] = useState<TrailForm>(initialValues || defaultFormData);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (requireFile && !file) {
            return;
        }
        await onSubmit(formData, file);
    };

    return (
        <div className="modal-content">
            <button className="modal-close" onClick={onClose}>
                <span className="material-icons">close</span>
            </button>
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
                        <div className="trail-form-group">
                            <label>Duration (hours)</label>
                            <input
                                type="number"
                                name="duration"
                                value={formData.duration}
                                onChange={handleInputChange}
                                min="0"
                                placeholder="Estimated duration"
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
                                value={tagsInput}
                                placeholder="Enter tags separated by commas"
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setTagsInput(value);
                                    const tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
                                    setFormData(prev => ({
                                        ...prev,
                                        tags
                                    }));
                                }}
                            />
                        </div>
                    </div>

                    <div className="trail-form-group">
                        <label>{requireFile ? 'Upload Trail File' : 'Replace Trail File (optional)'}</label>
                        <div className="file-upload">
                            <input
                                type="file"
                                onChange={handleFileChange}
                                accept=".gpx,.kml,.geojson"
                                required={requireFile}
                            />
                            <div className="file-info">
                                {file ? file.name : existingFileLabel || 'No file selected'}
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
                        {submitLabel}
                    </button>
                </form>
            </div>
        </div>
    );
};
