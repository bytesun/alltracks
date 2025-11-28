import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import { TrackPoint } from "../types/TrackPoint";
import { Navbar } from '../components/Navbar';
import { icon } from 'leaflet';

const defaultIcon = icon({
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export const TrackView = () => {
  const { trackId } = useParams();
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [showPoints, setShowPoints] = useState(true);

  const getPolylinePoints = () => {
    return trackPoints.map(point => [point.latitude, point.longitude]);
  };

  const getMapCenter = () => {
    if (trackPoints.length > 0) {
      const lastPoint = trackPoints[trackPoints.length - 1];
      return [lastPoint.latitude, lastPoint.longitude];
    }
    return [49.2827, -123.1207];
  };
  const getDuration = (): string => {
    if (trackPoints.length < 2) return '0:00';
    const startTime = trackPoints[0].timestamp;
    const endTime = trackPoints[trackPoints.length - 1].timestamp;
    const durationMs = endTime - startTime;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  
  const getTotalDistance = (): string => {
    if (trackPoints.length < 2) return '0.00';
    let total = 0;
    for (let i = 1; i < trackPoints.length; i++) {
      total += calculateDistance(
        trackPoints[i - 1].latitude,
        trackPoints[i - 1].longitude,
        trackPoints[i].latitude,
        trackPoints[i].longitude
      );
    }
    return total.toFixed(2);
  };

  const downloadTrackAsGPX = () => {
    if (trackPoints.length === 0) return;

    // Build GPX XML
    const gpxHeader = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="AllTracks" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Track ${trackId}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>Track ${trackId}</name>
    <trkseg>`;

    const gpxPoints = trackPoints.map(point => 
      `      <trkpt lat="${point.latitude}" lon="${point.longitude}">
        <ele>${point.elevation || 0}</ele>
        <time>${new Date(point.timestamp).toISOString()}</time>
      </trkpt>`
    ).join('\n');

    const gpxFooter = `
    </trkseg>
  </trk>
</gpx>`;

    const gpxContent = gpxHeader + '\n' + gpxPoints + gpxFooter;

    // Create blob and download
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `track-${trackId || 'export'}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadTrackAsJSON = () => {
    if (trackPoints.length === 0) return;

    const jsonData = {
      trackId,
      exportDate: new Date().toISOString(),
      stats: {
        distance: getTotalDistance(),
        duration: getDuration(),
        pointCount: trackPoints.length,
        startTime: trackPoints[0]?.timestamp,
        endTime: trackPoints[trackPoints.length - 1]?.timestamp,
      },
      points: trackPoints,
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `track-${trackId || 'export'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div>

      <div className="track-view">
        <div className="stats">
          {trackPoints.length > 0 && (
            <>
              <p>Start time: {new Date(trackPoints[0].timestamp).toLocaleString()}</p>
              <p>Duration: {getDuration()} hours</p>
              <p>Distance: {getTotalDistance()} km</p>
              <p>Recorded Points: {trackPoints.length}</p>
            </>
          )}
        </div>
        
        <div className="map-container">
          <MapContainer
            center={getMapCenter() as [number, number]}
            zoom={13}
            style={{ height: '400px', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              attribution=''
              maxZoom={17}
            />
            {showPoints && trackPoints.map((point) => (
              <Marker
                key={point.timestamp}
                position={[point.latitude, point.longitude]}
                icon={defaultIcon}
              />
            ))}
            <Polyline
              positions={getPolylinePoints() as [number, number][]}
              color="red"
            />
          </MapContainer>
        </div>

        <div className="map-controls">
          <label>
            <input
              type="checkbox"
              checked={showPoints}
              onChange={(e) => setShowPoints(e.target.checked)}
            />
            Show Points
          </label>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button
              onClick={downloadTrackAsGPX}
              disabled={trackPoints.length === 0}
              style={{
                padding: '8px 14px',
                background: '#2196F3',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: trackPoints.length > 0 ? 'pointer' : 'not-allowed',
                opacity: trackPoints.length > 0 ? 1 : 0.5,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Download GPX
            </button>
            <button
              onClick={downloadTrackAsJSON}
              disabled={trackPoints.length === 0}
              style={{
                padding: '8px 14px',
                background: '#4CAF50',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: trackPoints.length > 0 ? 'pointer' : 'not-allowed',
                opacity: trackPoints.length > 0 ? 1 : 0.5,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Download JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

