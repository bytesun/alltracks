import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMap, Marker, Popup } from 'react-leaflet';
import { TrackPoint } from "../types/TrackPoint";
import { icon } from 'leaflet';
import { useAlltracks, useGlobalContext } from '../components/Store';
import { StatusRecordModal } from '../components/StatusRecordModal';
import { useNotification } from '../context/NotificationContext';

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
    const { state: { isAuthed } } = useGlobalContext();
    const { showNotification } = useNotification();
    const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
    const [userLocation, setUserLocation] = useState<[number, number]>([49.2827, -123.1207]);
    const [locationStatus, setLocationStatus] = useState('Using your current location to show nearby points.');
    const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
    const [showQuickStatusModal, setShowQuickStatusModal] = useState(false);

    const [selectedPoint, setSelectedPoint] = useState<TrackPoint | null>(null);
    const [modalPhoto, setModalPhoto] = useState<string | null>(null);
    const RELOAD_INTERVAL = 30000; // 30 seconds
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    function CenterMapOnPoint() {
        const map = useMap();

        useEffect(() => {
            if (selectedPoint) {
                map.setView([selectedPoint.latitude, selectedPoint.longitude], 13);
            }
        }, [selectedPoint, map]);

        return null;
    }
    const updateCurrentLocation = () => {
        if (!navigator.geolocation) {
            setLocationStatus('Geolocation is not supported by this browser.');
            return;
        }

        setIsUpdatingLocation(true);
        setLocationStatus('Refreshing your current location...');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation([position.coords.latitude, position.coords.longitude]);
                setLocationStatus('Location updated. Nearby points are filtered within 10km of your current position.');
                setIsUpdatingLocation(false);
            },
            () => {
                setLocationStatus('Unable to update location. Check browser location permissions and try again.');
                setIsUpdatingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    useEffect(() => {
        updateCurrentLocation();
    }, []);


    useEffect(() => {
        // Initial load
        fetchTrackPoints();

        // Set up interval
        const intervalId = setInterval(fetchTrackPoints, RELOAD_INTERVAL);

        // Cleanup on unmount
        return () => clearInterval(intervalId);
    }, [userLocation]); // Depend on userLocation

    const fetchTrackPoints = async () => {
        const today = new Date();
        today.setHours(23, 59, 59, 0);
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const endDate = new Date(Date.now())

        const checkpoints = await alltracks.getIncidentCheckpoints(BigInt(startDate.getTime()), BigInt(today.getTime()))
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
        setLastUpdate(new Date());
    };
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

    const openQuickStatusModal = () => {
        if (!isAuthed) {
            showNotification('Please login to record your current status.', 'info');
            return;
        }
        setShowQuickStatusModal(true);
    };

    const handleQuickStatusSave = async (data: { description: string; tagsInput: string }) => {
        try {
            const [latitude, longitude] = userLocation;
            const tags = data.tagsInput
                .split(',')
                .map((tag) => tag.trim())
                .filter(Boolean);

            const description = JSON.stringify({
                latitude,
                longitude,
                note: data.description.trim()
            });

            const spotName = `Status ${new Date().toLocaleString()}`;
            const result: any = await alltracks.createSpot({ name: spotName, description, tags });

            if (result && result.ok) {
                setShowQuickStatusModal(false);
                showNotification('Current status recorded.', 'success');
            } else {
                const message = result?.err || 'Unknown error';
                showNotification(`Failed to record status: ${message}`, 'error');
            }
        } catch (error) {
            console.error('Failed to record current status', error);
            showNotification('Unable to record current status.', 'error');
        }
    };

    return (
        <div className="event-page">

            <div className="status-container">
                <div className="status-header">
                    <h3>Live Report Points</h3>
                    <div className="status-header-actions">
                        <button
                            type="button"
                            className="location-refresh-btn secondary-action"
                            onClick={openQuickStatusModal}
                        >
                            <span className="material-icons">note_add</span>
                            Record current status
                        </button>
                        <button
                            type="button"
                            className="location-refresh-btn"
                            onClick={updateCurrentLocation}
                            disabled={isUpdatingLocation}
                        >
                            <span className="material-icons">my_location</span>
                            {isUpdatingLocation ? 'Updating location...' : 'Update current location'}
                        </button>
                        <div className="update-notice">
                            Last updated: {lastUpdate.toLocaleTimeString()}
                        </div>
                    </div>
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
                <div className="location-status-note">
                    <span className="material-icons">info</span>
                    <span>{locationStatus}</span>
                </div>

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

            {showQuickStatusModal && (
                <StatusRecordModal
                    location={{ latitude: userLocation[0], longitude: userLocation[1] }}
                    onSave={handleQuickStatusSave}
                    onClose={() => setShowQuickStatusModal(false)}
                />
            )}

        </div>
    );
};
