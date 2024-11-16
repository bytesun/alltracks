import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, Marker, TileLayer, Popup, useMap } from 'react-leaflet';

import { Icon } from 'leaflet';

import 'leaflet/dist/leaflet.css';
import 'leaflet/dist/images/marker-shadow.png';

import { TrackPoint } from '../types/TrackPoint';
import { listDocs } from "@junobuild/core";
import "../styles/UserPage.css";
import { Navbar } from '../components/Navbar';


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

export const UserPage: React.FC = () => {
    const { userKey } = useParams();
    const [selectedPoint, setSelectedPoint] = useState<TrackPoint | null>(null);
    const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
    const [startDate, setStartDate] = useState<string>(
        new Date(Date.now() - 30*24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        loadTrackPoints();
    }, [userKey]);


    const loadTrackPoints = async () => {

        const start = BigInt(new Date(startDate).getTime() * 1000000);
        const end = BigInt(new Date(endDate).getTime() * 1000000);
        console.log("start", start);
        console.log("end", end);
        console.log("loadTrackPoints");
        const result = await listDocs({
            collection: "live_tracks",
            filter: {
                owner: userKey,
                matcher: {
                    createdAt: {
                        matcher: "between",
                        timestamps: {
                            start: start,
                            end: end
                        }
                    }

                },
                order: {
                    desc: true,
                    field: "updated_at"
                  },
            }
        });
        const points = result.items.map(doc => doc.data as TrackPoint);
        setTrackPoints(points);
        if (points.length > 0) {
            setSelectedPoint(points[0]);
        }
        setIsLoading(false);
    };
    return (
        <div>
            <Navbar />

            <div className="user-page">
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
                                <Popup>
                                    <div className="marker-popup">
                                        <div className="marker-details">
                                            <p> {point.comment}</p>
                                            <img src={point.photo} alt="Image" />
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
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="date-input">
                            <label>To:</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <button
                            className="load-button"
                            onClick={loadTrackPoints}
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
                                
                                {new Date(point.timestamp).toLocaleTimeString()},{new Date(point.timestamp).toLocaleDateString()} 
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
        </div>
    );
};