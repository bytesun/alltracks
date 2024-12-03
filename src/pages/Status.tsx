import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, useMap, Polyline, Marker, Popup } from 'react-leaflet';
import { TrackPoint } from "../types/TrackPoint";
import { listDocs } from "@junobuild/core";
import { parseGPX } from "../utils/importFormats";
import { icon } from 'leaflet';
import { Navbar } from '../components/Navbar';
import { useAlltracks, useICEvent } from '../components/Store';

import "../styles/Status.css";

const locationIcon = icon({
    iconUrl: '/marker-icon.png',
    iconSize: [24, 35],
    iconAnchor: [12, 12],
    className: 'incident-marker'
});
const selectedLocationIcon = icon({
    iconUrl: '/marker-selected-icon.png',
    iconSize: [32, 42],
    iconAnchor: [16, 16],
    className: 'selected-marker'
});

export const Status: React.FC = () => {

    const alltracks = useAlltracks();
    const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
    const [userLocation, setUserLocation] = useState<[number, number]>([49.2827, -123.1207]);

    const [selectedPoint, setSelectedPoint] = useState<TrackPoint | null>(null);
    const [modalPhoto, setModalPhoto] = useState<string | null>(null);
    const [showIncidents, setShowIncidents] = useState(true);
    const [showInscriptions, setShowInscriptions] = useState(false);

    function CenterMapOnPoint() {
        const map = useMap();

        useEffect(() => {
            if (selectedPoint) {
                map.setView([selectedPoint.latitude, selectedPoint.longitude], 13);
            }
        }, [selectedPoint, map]);

        return null;
    }
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation([position.coords.latitude, position.coords.longitude]);
                }
            );
        }
    }, []);


    useEffect(() => {
        const fetchTrackPoints = async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            const endDate = new Date(Date.now())

            const checkpoints = await alltracks.getIncidentCheckpoints(BigInt(startDate.getTime()), BigInt(endDate.getTime()))
            console.log(checkpoints)
            // const tracks = await listDocs({
            //     collection: "incidents",
            //     filter: {
            //         matcher: {
            //             createdAt: {
            //                 matcher: "greaterThan",
            //                 timestamp: BigInt(today.getTime()* 1_000_000)
            //             },
            //         },

            //     }
            // });

            const points = checkpoints.map(p => {
                return {
                    latitude: p.latitude,
                    longitude: p.longitude,
                    elevation: p.elevation,
                    timestamp: Number(p.timestamp),
                    comment: p.note[0],
                    photo: p.photo.length > 0 ? p.photo[0] : undefined,
                } as TrackPoint;
            });


            const filteredPoints = userLocation ? points.filter(point => {
                const distance = calculateDistance(
                    point.latitude,
                    point.longitude,
                    userLocation[0],
                    userLocation[1]
                );
                return distance <= 10000;
            }) : [];

            setTrackPoints(filteredPoints);
        };
        fetchTrackPoints();
    }, []);

    const getMapCenter = (): [number, number] => {
        if (trackPoints.length > 0) {
            const lastPoint = trackPoints[trackPoints.length - 1];
            return [lastPoint.latitude, lastPoint.longitude];
        }
        return userLocation;
    };

    function RecenterMap({ position }: { position: [number, number] }) {
        const map = useMap();
        map.setView(position);
        return null;
    }
    function RecenterOnLoad() {
        const map = useMap();

        useEffect(() => {
            if (trackPoints.length > 0) {
                const lastPoint = trackPoints[trackPoints.length - 1];
                map.setView([lastPoint.latitude, lastPoint.longitude], 13);
            }
        }, [trackPoints, map]);

        return null;
    }
    function CenterControl() {
        const map = useMap();

        return (
            <div className="leaflet-top leaflet-left custom-controls">
                <div className="leaflet-control leaflet-bar">
                    <a
                        href="#"
                        className="leaflet-control-button"
                        onClick={(e) => {
                            e.preventDefault();
                            if (trackPoints.length > 0) {
                                const lastPoint = trackPoints[trackPoints.length - 1];
                                map.setView([lastPoint.latitude, lastPoint.longitude], 13);
                            }
                        }}
                        title="Center on Last Position"
                    >
                        <span className="material-icons">person_pin_circle</span>
                    </a>
                </div>
            </div>
        );
    }

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };

    return (
        <div className="event-page">
            <Navbar />
            <div className="status-container">
                <div className="status-header">
                    <h3>Live Report Points</h3>
                    {/* <div className="status-filters">
                        <label>
                            <input 
                                type="checkbox"
                                checked={showIncidents}
                                onChange={(e) => setShowIncidents(e.target.checked)}
                            />
                            Incidents
                        </label>
                        <label>
                            <input 
                                type="checkbox"
                                checked={showInscriptions}
                                onChange={(e) => setShowInscriptions(e.target.checked)}
                            />
                            Inscriptions
                        </label>
                    </div> */}
                </div>
                <p className="track-description">
                    Showing tracking important points of interest or hazards from today within 10km of your location
                    {trackPoints.length > 0 && ` (${trackPoints.length} points found)`}
                </p>

                <div className="status-content">
                    {/* Left Column - Points List */}
                    <div className="points-list-column">
                        <div className="list-panel">
                        {trackPoints.length > 0 ? (
                            <div className="points-feed">
                                {[...trackPoints]
                                    .sort((a, b) => b.timestamp - a.timestamp)
                                    .map((point) => (
                                        <div
                                            key={point.timestamp}
                                            className={`feed-item ${selectedPoint?.timestamp === point.timestamp ? 'feed-selected' : ''}`}
                                            onClick={() => setSelectedPoint(point)}
                                        >
                                            <div className="feed-time">
                                                <span className="feed-date">
                                                    {new Date(point.timestamp).toLocaleDateString('en-US', {
                                                        weekday: 'short',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </span>
                                                <span className="feed-clock">
                                                    {new Date(point.timestamp).toLocaleTimeString('en-US', {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>

                                            <div className="feed-content">

                                                {point.comment && <div className="feed-comment">{point.comment}</div>}
                                                {point.photo && (
                                                    <img
                                                        src={point.photo}
                                                        alt="Point photo"
                                                        className="feed-photo"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setModalPhoto(point.photo);
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                            ) : (
                                <div className="empty-state">
                                  <span className="material-icons">info</span>
                                  <h3>No Incidents Reported</h3>
                                </div>
                              )}
                        </div>

                        {modalPhoto && (
                            <div className="modal-overlay" onClick={() => setModalPhoto(null)}>
                                <div className="modal-content">
                                    <img src={modalPhoto} alt="Full size" />
                                    <button className="modal-close" onClick={() => setModalPhoto(null)}>×</button>
                                </div>
                            </div>
                        )}


                    </div>

                    {/* Right Column - Map */}
                    <div className="map-column">
                        <MapContainer
                            center={selectedPoint ? [selectedPoint.latitude, selectedPoint.longitude] : getMapCenter()}
                            zoom={13}
                            className="map-container"
                        >
                            <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" />

                            {selectedPoint && (
                                <Marker
                                    position={[selectedPoint.latitude, selectedPoint.longitude]}
                                    icon={locationIcon}
                                >
                                    <Popup>
                                        <div className="point-popup">
                                            <p>Time: {new Date(selectedPoint.timestamp).toLocaleString()}</p>
                                            {selectedPoint.comment && <p>Note: {selectedPoint.comment}</p>}
                                            {selectedPoint.elevation && <p>Elevation: {selectedPoint.elevation.toFixed(1)}m</p>}
                                            {selectedPoint.photo && (
                                                <img
                                                    src={selectedPoint.photo}
                                                    alt="Location"
                                                    className="popup-photo"
                                                />
                                            )}
                                        </div>
                                    </Popup>
                                </Marker>
                            )}

                            <CenterMapOnPoint />
                        </MapContainer>

                    </div>
                </div>
            </div>

        </div>
    );
};
