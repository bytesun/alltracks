import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, useMap, Polyline, Marker } from 'react-leaflet';
import { TrackPoint } from "../types/TrackPoint";

import { icon } from 'leaflet';

import "../styles/Live.css";
import { useAlltracks, useICEvent } from '../components/Store';
import { locationIcon, selectedLocationIcon } from '../lib/markerIcons';


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

    const latestPoint = trackPoints.length > 0 ? trackPoints[trackPoints.length - 1] : null;

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
                    {trackPoints.map((point, index) => (
                        <Marker
                            key={point.timestamp}
                            position={[point.latitude, point.longitude]}
                            icon={
                                (selectedPoint && selectedPoint.timestamp === point.timestamp) ||
                                (!selectedPoint && latestPoint && latestPoint.timestamp === point.timestamp)
                                    ? selectedLocationIcon
                                    : locationIcon
                            }
                            zIndexOffset={
                                (selectedPoint && selectedPoint.timestamp === point.timestamp) ||
                                (!selectedPoint && latestPoint && latestPoint.timestamp === point.timestamp)
                                    ? 1000
                                    : 0
                            }
                            eventHandlers={{
                                click: () => setSelectedPoint(point)
                            }}
                        />
                    ))}
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
                                <th>Notes</th>

                            </tr>
                        </thead>
                        <tbody>
                            {[...trackPoints].reverse().map((point, index, array) => {
                                const currentDate = new Date(point.timestamp).toLocaleDateString();
                                const previousDate = index > 0
                                    ? new Date(array[index - 1].timestamp).toLocaleDateString()
                                    : null;
                                const isLatest = !selectedPoint && latestPoint && latestPoint.timestamp === point.timestamp;
                                const isSelected = selectedPoint && selectedPoint.timestamp === point.timestamp;
                                return (
                                    <tr key={point.timestamp}>
                                        <td>
                                            <div>
                                                {(index === 0 || currentDate !== previousDate) && (
                                                    <span className="date">{new Date(point.timestamp).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit'
                                                    })}</span>
                                                )}
                                            </div>
                                            <div className="timestamp">
                                                <span className="time">{new Date(point.timestamp).toLocaleTimeString('en-US', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}</span>
                                            </div>
                                        </td>
                                        <td
                                            className="location-cell"
                                            style={{ cursor: 'pointer', background: isSelected || isLatest ? '#ffeeba' : undefined }}
                                            onClick={() => setSelectedPoint(point)}
                                        >
                                            <div>Lat: {point.latitude.toFixed(4)}</div>
                                            <div>Lng: {point.longitude.toFixed(4)}</div>
                                            <div>Elev: {point.elevation?.toFixed(1) || '-'} m</div>
                                        </td>
                                        <td>{point.comment }
                                        {point.photo && (
                                            <img
                                                src={point.photo}
                                                alt="Thumbnail"
                                                className="thumbnail-photo"
                                                onClick={() => setModalPhoto(point.photo)}
                                                style={{ cursor: 'pointer' }}
                                            />
                                        )}
                                         </td>
                                    </tr>
                                );
                            })}

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

