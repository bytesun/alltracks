import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, useMap, Polyline, Marker } from 'react-leaflet';
import { TrackPoint } from "../types/TrackPoint";

import { icon } from 'leaflet';

import "../styles/Live.css";
import { useAlltracks, useICEvent } from '../components/Store';


const locationIcon = icon({
    iconUrl: '/marker-icon.png',
    iconSize: [24, 35],
    iconAnchor: [12, 12]
});

const trailHeadIcon = icon({
    iconUrl: '/marker-icon.png',
    shadowUrl: '/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
export const Live: React.FC = () => {
    const { liveId } = useParams();
    const alltracks = useAlltracks();

    const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
    const [trailPoints, setTrailPoints] = useState<[number, number][]>([
        [49.2827, -123.1207],
        [49.2830, -123.1210],
        [49.2835, -123.1215],
        // Add more trail coordinates as needed
    ]);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    const [selectedPoint, setSelectedPoint] = useState<TrackPoint | null>(null);
    const [modalPhoto, setModalPhoto] = useState<string | null>(null);


    function CenterMapOnPoint() {
        const map = useMap();

        useEffect(() => {
            if (selectedPoint) {
                map.setView([selectedPoint.latitude, selectedPoint.longitude], 13);
            }
        }, [selectedPoint, map]);

        return null;
    }

    const RELOAD_INTERVAL = 10000; // 60 seconds = 1 minute

    useEffect(() => {
        // Initial load
        fetchTrackPoints();

        // Set up interval
        const intervalId = setInterval(() => {
            fetchTrackPoints();
        }, RELOAD_INTERVAL);

        // Cleanup interval on component unmount
        return () => clearInterval(intervalId);
    }, [liveId]);

    const fetchTrackPoints = async () => {

        const result = await alltracks.getCheckPointsByTrackId(liveId)

        let tps = [];
        result.forEach(t => {
            tps.push(
                {
                    latitude: t.latitude,
                    longitude: t.longitude,
                    elevation: t.elevation,
                    timestamp: Number(t.timestamp),
                    comment: t.note,
                    photo: t.photo.length > 0 ? t.photo[0] : undefined,
                }
            )
        })
        
        tps.sort((a, b) => a.timestamp - b.timestamp);
        setTrackPoints(tps);
        setLastUpdate(new Date());
    };
    const getMapCenter = () => {
        if (trailPoints.length > 0) {
            return trailPoints[0];
        }
        return [49.2827, -123.1207]; // Default center if no trail points
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

    return (
        <div className="live-page">
            <div className="map-section">
                <MapContainer
                    center={getMapCenter() as [number, number]}
                    zoom={13}
                    scrollWheelZoom={true}
                >
                    <TileLayer
                        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <CenterControl />
                    <RecenterOnLoad />
                    <CenterMapOnPoint />
                    {trackPoints.length > 0 && (
                        <Polyline
                            positions={trackPoints.map(p => [p.latitude, p.longitude])}
                            color="red"
                        />
                    )}
                    {trackPoints.length > 0 && (
                        <Marker
                            position={[
                                trackPoints[trackPoints.length - 1].latitude,
                                trackPoints[trackPoints.length - 1].longitude
                            ]}
                            icon={locationIcon}
                        />
                    )}
                </MapContainer>
            </div>

            <div className="data-section">
                <div className="update-notice">
                    Last updated: {lastUpdate.toLocaleTimeString()}
                </div>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Location</th>
                                <th>Elevation</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trackPoints.map(point => (
                                <tr key={point.timestamp}>
                                    <td>{new Date(point.timestamp).toLocaleTimeString()}</td>
                                    <td>{`${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`}</td>
                                    <td>{point.elevation?.toFixed(1) || '-'} m</td>
                                    <td>{point.comment || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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
    );
};

