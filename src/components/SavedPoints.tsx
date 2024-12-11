import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useGlobalContext, useAlltracks } from './Store';
import { SavePointModal } from './SavePointModal';
import '../styles/SavedPoints.css';
import { icon } from 'leaflet';

const defaultIcon = icon({
    iconUrl: '/marker-icon.png',
    shadowUrl: '/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

interface SavedPoint {

    latitude: number;
    longitude: number;
    category: string;
    description: string;

}
export const SavedPoints: React.FC = () => {
    const [points, setPoints] = useState<SavedPoint[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [categories] = useState(['all', 'view', 'scenic', 'rest',  'camp']);
    const alltracks = useAlltracks();
    const { state: { principal } } = useGlobalContext();
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [selectedPoint, setSelectedPoint] = useState<{ latitude: number; longitude: number } | null>(null);


    const loadSavedPoints = async () => {
        const savedPoints = await alltracks.getMySavedPoints();
        setPoints(savedPoints);
    };

    useEffect(() => {
        loadSavedPoints();
    }, []);

    const filteredPoints = selectedCategory === 'all'
        ? points
        : points.filter(point => point.category === selectedCategory);

    function MapClickHandler() {
        const map = useMap();

        useEffect(() => {
            map.on('click', (e) => {
                const location = {
                    latitude: e.latlng.lat,
                    longitude: e.latlng.lng
                };
                setSelectedLocation(location);
                setSelectedPoint(location);
                setShowSaveModal(true);
            });
        }, [map]);

        return null;
    }
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
                <MapClickHandler />
                <TileLayer
                    url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                    attribution='Map data: © OpenTopoMap contributors'
                />
                {selectedPoint && (
                    <Marker
                        position={[selectedPoint.latitude, selectedPoint.longitude]}
                        icon={defaultIcon}
                    >
                        <Popup>
                            Selected Location
                        </Popup>
                    </Marker>
                )}
                {filteredPoints.map((point, i) => (
                    <Marker
                        key={i}
                        position={[point.latitude, point.longitude]}
                    >
                        <Popup>
                            <div className="point-popup">
                                <h3>{point.category}</h3>
                                <p>{point.description}</p>

                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {showSaveModal && (
                <SavePointModal
                    location={selectedLocation}
                    onSave={async (data) => {
                        await alltracks.createSavedPoint({
                            latitude: selectedLocation.latitude,
                            longitude: selectedLocation.longitude,
                            category: data.category,
                            description: data.description
                        });
                        setShowSaveModal(false);
                        setSelectedPoint(null);
                        loadSavedPoints();
                    }}
                    onClose={() => {
                        setShowSaveModal(false);
                        setSelectedPoint(null);
                    }}
                />
            )}
        </div>
    );
};
