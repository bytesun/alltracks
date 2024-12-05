import React, { useState, useEffect } from 'react';
import { MapContainer, Marker, TileLayer, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';

import { TrackPoint } from '../types/TrackPoint';
import 'leaflet/dist/leaflet.css';
import '../styles/TimelineMapView.css';
import { useGlobalContext, useAlltracks } from './Store';

interface TimelineMapViewProps {
    trackPoints: TrackPoint[];
    isLoading: boolean;
    startDate: string;
    endDate: string;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
    onLoadPoints: () => void;
}
const defaultIcon = new Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

const highlightedIcon = new Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const MapController: React.FC<{ selectedPoint: TrackPoint | null }> = ({ selectedPoint }) => {
    const map = useMap();
    useEffect(() => {
        if (selectedPoint) {
            map.setView([selectedPoint.latitude, selectedPoint.longitude], 13);
        }
    }, [selectedPoint, map]);
    return null;
};


export const TimelineMapView: React.FC<TimelineMapViewProps> = ({
    trackPoints,
    isLoading,
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    onLoadPoints
}) => {
    const { state: { isAuthed, principal } } = useGlobalContext();
    const alltracks = useAlltracks();
    const [selectedPoint, setSelectedPoint] = useState<TrackPoint | null>(null);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [selectedPointToSave, setSelectedPointToSave] = useState<TrackPoint | null>(null);

    const handleSaveClick = (point: TrackPoint) => {
        setSelectedPointToSave(point);
        setShowSaveModal(true);
    };

    useEffect(() => {
        if (trackPoints.length > 0) {
            setSelectedPoint(trackPoints[0]);
        }

    }, [trackPoints]);

    const handleSavePoint = async (point: TrackPoint, data: any) => {
        const result = await alltracks.createSavedPoint({
            latitude: point.latitude,
            longitude: point.longitude,
            description: data.description,
            category: data.category,
        });

    };
    const SavePointModal = ({ point, onSave, onClose }) => {
        const [description, setDescription] = useState('');
        const [category, setCategory] = useState('');
        const categories = ['view', 'rest', 'scenic', 'camp', 'other'];

        return (
            <div className="modal-overlay">
                <div className="modal-content">
                    <h3>Save My Favorite Point</h3>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add description..."
                        rows={3}
                    />
                    <div className="category-list">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                className={`category-tag ${category === cat ? 'selected' : ''}`}
                                onClick={() => setCategory(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                    <div className="modal-buttons">
                        <button onClick={() => onSave({ description, category })}>Save</button>
                        <button onClick={onClose}>Cancel</button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="timeline-map-view">
            <div className="map-column">
                <MapContainer
                    center={trackPoints.length > 0
                        ? [trackPoints[0].latitude, trackPoints[0].longitude]
                        : [49.2827, -123.1207]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                >
                    <MapController selectedPoint={selectedPoint} />
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {selectedPoint && (
                        <Marker
                            position={[selectedPoint.latitude, selectedPoint.longitude]}
                            icon={highlightedIcon}
                        >
                            <Popup autoPan={true}>
                                <div className="marker-popup">
                                    <div className="marker-details">
                                        {selectedPoint.photo && (
                                            <div className="image-container">
                                                <div className="image-placeholder">
                                                    <span className="material-icons">image</span>
                                                    <span>Loading...</span>
                                                </div>
                                                <img
                                                    src={selectedPoint.photo}
                                                    alt="Location"
                                                    className="location-image"
                                                    onClick={() => window.open(selectedPoint.photo, '_blank')}
                                                    onLoad={(e) => {
                                                        (e.currentTarget as HTMLElement).style.display = 'block';
                                                        (e.currentTarget.previousElementSibling as HTMLElement)!.style.display = 'none';
                                                    }}
                                                    style={{ display: 'none', cursor: 'pointer' }}
                                                    onError={(e) => {
                                                        (e.currentTarget as HTMLElement).style.display = 'none';
                                                        (e.currentTarget.previousElementSibling as HTMLElement)!.style.display = 'flex';
                                                        const placeholder = e.currentTarget.previousElementSibling!.querySelector('span:last-child');
                                                        if (placeholder) placeholder.textContent = 'Failed to load image';
                                                    }}
                                                />

                                            </div>
                                        )}
                                        <p>{selectedPoint.comment ? selectedPoint.comment : "no info"}</p>
                                        {isAuthed && <button
                                            className="favorite-btn"
                                            onClick={() => handleSaveClick(selectedPoint)}
                                        >
                                            <span className="material-icons">
                                                bookmark
                                            </span>
                                        </button>}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                </MapContainer>
            </div>
            <div className="timeline-column">
                <div className="date-filters">
                    <div className="date-input">
                        <label>From:</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => onStartDateChange(e.target.value)}
                        />
                    </div>
                    <div className="date-input">
                        <label>To:</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => onEndDateChange(e.target.value)}
                        />
                    </div>
                    <button
                        className="load-button"
                        onClick={onLoadPoints}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Loading...' : 'Load Points'}
                    </button>
                </div>
                {trackPoints.map((point, index) => (
                    <div
                        key={index}
                        className={`timeline-item ${selectedPoint === point ? 'active' : ''}`}
                        onClick={() => setSelectedPoint(point)}
                    >
                        <div className="time">
                            {new Date(Number(point.timestamp)).toLocaleTimeString()}, {new Date(Number(point.timestamp)).toLocaleDateString()}
                        </div>
                        <div className="details">
                            <div>Lat: {point.latitude.toFixed(4)}</div>
                            <div>Lng: {point.longitude.toFixed(4)}</div>
                            <div>Elevation: {point.elevation.toFixed(2)}m</div>


                        </div>
                    </div>
                ))}
            </div>
            {showSaveModal && selectedPointToSave && (
                <SavePointModal
                    point={selectedPointToSave}
                    onSave={(data) => {
                        handleSavePoint(selectedPointToSave, data);
                        setShowSaveModal(false);
                    }}
                    onClose={() => setShowSaveModal(false)}
                />
            )}
        </div>
    );
};