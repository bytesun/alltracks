import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, useMap, Polyline, Marker } from 'react-leaflet';
import { TrackPoint } from '../utils/exportFormats';
import { listDocs } from "@junobuild/core";
import { parseGPX } from "../utils/importFormats";
import { icon } from 'leaflet';
import { Navbar } from '../components/Navbar';
import "../styles/Live.css";

interface EventDetails {
    date: string;
    location: string;
    trailName: string;
    coordinates: [number, number];
}

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
    const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
    const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
    const [trailPoints, setTrailPoints] = useState<[number, number][]>([
        [49.2827, -123.1207],
        [49.2830, -123.1210],
        [49.2835, -123.1215],
        // Add more trail coordinates as needed
    ]);
    const [selectedPoint, setSelectedPoint] = useState<TrackPoint | null>(null);

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
        const fetchTrackPoints = async () => {
            const tracks = await listDocs({
                collection: "live_tracks",
                filter: {
                    matcher: {
                        key: "^" + liveId + "_",
                    }
                }

            });

            const points = tracks.items.map(doc => doc.data as TrackPoint);
            setTrackPoints(points);
        };
        fetchTrackPoints();
    }, [liveId]);

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
        <div className="event-page">
            <Navbar />
            <div className="live-container">
                <h3>Live Track Points</h3>
                <MapContainer
                    center={getMapCenter() as [number, number]}
                    zoom={13}
                    style={{ height: '400px', width: '100%' }}
                >
                    <CenterControl />
                    <RecenterOnLoad />
                    <CenterMapOnPoint />
                    {trailPoints.length > 0 && <RecenterMap position={trailPoints[0]} />}
                    {trailPoints.length > 0 && (
                        <Marker
                            position={trailPoints[0]}
                            icon={trailHeadIcon}
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
                    <TileLayer url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" />
                    <Polyline
                        positions={trackPoints.map(p => [p.latitude, p.longitude])}
                        color="red"
                    />

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
                                                        window.open(point.photo, '_blank');
                                                    }}
                                                />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
