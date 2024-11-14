import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, useMap, Polyline, Marker, Popup } from 'react-leaflet';
import { TrackPoint } from '../utils/exportFormats';
import { listDocs } from "@junobuild/core";
import { parseGPX } from "../utils/importFormats";
import { icon } from 'leaflet';
import { Navbar } from '../components/Navbar';

import { User, authSubscribe, signIn, signOut } from "@junobuild/core";

import "../styles/Status.css";

const locationIcon = icon({
    iconUrl: '/marker-icon.png',
    iconSize: [24, 35],
    iconAnchor: [12, 12]
});


export const Status: React.FC = () => {

    const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
    const [userLocation, setUserLocation] = useState<[number, number]>([49.2827, -123.1207]);
    const [user, setUser] = useState<User | null>(null);
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
        const unsubscribe = authSubscribe((user: User | null) => {
            setUser(user);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchTrackPoints = async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const tracks = await listDocs({
                collection: "incidents",
                filter: {
                    matcher: {
                        createdAt: {
                            matcher: "greaterThan",
                            timestamp: BigInt(today.getTime()* 1_000_000)
                        },
                    },

                }
            });

            const points = tracks.items.map(doc => doc.data as TrackPoint);

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
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;
    
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
        return R * c;
    };
    
    return (
        <div className="event-page">
            <Navbar />
            <div className="status-container">
                <div className="status-header">
                    <h3>Live Report Points</h3>
                    <div className="status-filters">
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
                    </div>
                </div>
                <p className="track-description">
                    Showing tracking important points of interest or hazards from today within 10km of your location
                    {trackPoints.length > 0 && ` (${trackPoints.length} points found)`}
                </p>
                <MapContainer
                    center={getMapCenter() as [number, number]}
                    zoom={13}
                    style={{ height: '400px', width: '100%' }}
                >
                    <RecenterOnLoad />
                    <CenterMapOnPoint />

                    {trackPoints.map((point) => (
                        <Marker
                            key={point.timestamp}
                            position={[point.latitude, point.longitude]}
                            icon={locationIcon}
                        >
                            <Popup>
                                <div>
                                    <p>Time: {new Date(point.timestamp).toLocaleString()}</p>
                                    {point.comment && <p>Note: {point.comment}</p>}
                                    {point.elevation && <p>Elevation: {point.elevation.toFixed(1)}m</p>}
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" />


                </MapContainer>
                <div className="track-points-list">

                    <table className="points-table">
                        <tbody>
                            {[...trackPoints]
                                .sort((a, b) => b.timestamp - a.timestamp)
                                .map((point) => (
                                    <tr
                                        key={point.timestamp}
                                        onClick={() => setSelectedPoint(point)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td>{new Date(point.timestamp).toLocaleTimeString()}</td>
                                        <td>{point.latitude.toFixed(6)}</td>
                                        <td>{point.longitude.toFixed(6)}</td>
                                        <td>{point.elevation?.toFixed(1) || '-'} m</td>
                                        <td>{point.comment} </td>
                                        <td>
                                            {point.photo && (
                                                <img
                                                    src={point.photo}
                                                    alt="Point photo"
                                                    style={{
                                                        width: '50px',
                                                        height: '50px',
                                                        objectFit: 'cover',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (point.photo) {
                                                            setModalPhoto(point.photo);
                                                        }

                                                    }}
                                                />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            {modalPhoto && (
                                <div className="modal-overlay" onClick={() => setModalPhoto(null)}>
                                    <div className="modal-content">
                                        <img src={modalPhoto} alt="Full size" />
                                        <button className="modal-close" onClick={() => setModalPhoto(null)}>×</button>
                                    </div>
                                </div>
                            )}

                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
