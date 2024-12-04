import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useGlobalContext, useAlltracks } from './Store';
import '../styles/SavedPoints.css';

interface SavedPoint {

    latitude: number;
    longitude: number;
    category: string;
    description: string;
    
}

export const SavedPoints: React.FC = () => {
    const [points, setPoints] = useState<SavedPoint[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [categories] = useState(['all', 'view', 'scenic', 'rest', 'water', 'camp', 'other']);
    const alltracks = useAlltracks();
    const { state: { principal } } = useGlobalContext();

    useEffect(() => {
        const loadSavedPoints = async () => {
            const savedPoints = await alltracks.getMySavedPoints();
            setPoints(savedPoints);
        };
        loadSavedPoints();
    }, []);

    const filteredPoints = selectedCategory === 'all'
        ? points
        : points.filter(point => point.category === selectedCategory);

    return (
        <div className="saved-points">
            <div className="category-filter">
                {categories.map(category => (
                    <button
                        key={category}
                        className={`filter-button ${selectedCategory === category ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(category)}
                    >
                        <span className="material-icons">
                            {category === 'view' && 'visibility'}
                            
                            {category === 'camp'}
                            {category === 'scenic' && 'photo_camera'}
                            {category === 'rest' && 'chair'}
                            {category === 'water' && 'water_drop'}

                            {category === 'all' && 'list'}
                            {category === 'other' && 'place'}
                        </span>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                    </button>
                ))}
            </div>

            <MapContainer
                center={[49.2827, -123.1207]}
                zoom={11}
                style={{ height: '600px', width: '100%' }}
            >
                <TileLayer
                    url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                    attribution='Map data: © OpenTopoMap contributors'
                />
                {filteredPoints.map(point => (
                    <Marker
                        key={point.id}
                        position={[point.latitude, point.longitude]}
                    >
                        <Popup>
                            <div className="point-popup">
                                <h3>{point.category}</h3>
                                <p>{point.description}</p>
                                <small>{new Date(point.timestamp).toLocaleDateString()}</small>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};
