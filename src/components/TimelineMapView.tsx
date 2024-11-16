import React, { useState, useEffect } from 'react';
import { MapContainer, Marker, TileLayer, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { listDocs } from "@junobuild/core";
import { TrackPoint } from '../types/TrackPoint';
import 'leaflet/dist/leaflet.css';
import '../styles/TimelineMapView.css';



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

interface TimelineMapViewProps {
    trackPoints: TrackPoint[];
    isLoading: boolean;
    startDate: string;
    endDate: string;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
    onLoadPoints: () => void;
}

export const TimelineMapView: React.FC<TimelineMapViewProps> = ({
    trackPoints,
    isLoading,
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    onLoadPoints
}) => {
    const [selectedPoint, setSelectedPoint] = useState<TrackPoint | null>(null);

    useEffect(() => {
        if (trackPoints.length > 0) {
            setSelectedPoint(trackPoints[0]);
        }
    }, [trackPoints]);

    return (
        <div className="timeline-map-view">
            <div className="map-column">
                <MapContainer
                    center={trackPoints.length > 0
                        ? [trackPoints[0].latitude, trackPoints[0].longitude]
                        : [51.505, -0.09]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                >
                    <MapController selectedPoint={selectedPoint} />
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {trackPoints.map((point, index) => (
                        <Marker
                            key={index}
                            position={[point.latitude, point.longitude]}
                            icon={selectedPoint === point ? highlightedIcon : defaultIcon}
                        >
                            <Popup >
                                <div className="marker-popup">
                                    <div className="marker-details">

                                        {point.photo && (
                                            <div className="image-container">
                                                <div className="image-placeholder">
                                                    <span className="material-icons">image</span>
                                                    <span>Loading...</span>
                                                </div>
                                                <img
                                                    src={point.photo}
                                                    alt="Location"
                                                    className="location-image"
                                                    onClick={() => window.open(point.photo, '_blank')}
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
                                        <p>{point.comment}</p>
                                    </div>
                                </div>
                            </Popup>

                        </Marker>
                    ))}
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
                            {new Date(point.timestamp).toLocaleTimeString()}, {new Date(point.timestamp).toLocaleDateString()}
                        </div>
                        <div className="details">
                            <div>Lat: {point.latitude.toFixed(4)}</div>
                            <div>Lng: {point.longitude.toFixed(4)}</div>
                            <div>Elevation: {point.elevation}m</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};