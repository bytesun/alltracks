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
  // Optionally, set activityType here or get from props/context
  const activityType: string = 'hiking'; // TODO: Replace with real source if available

  const getDuration = (): string => {
    if (trackPoints.length < 2) return '0:00';
    const startTime = trackPoints[0].timestamp;
    const endTime = trackPoints[trackPoints.length - 1].timestamp;
    const durationMs = endTime - startTime;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  // Calculate pace (min/km) and filter out unrealistic points for each activity type
  const getPaceAndFilteredDistance = () => {
    if (trackPoints.length < 2) return { total: 0, pace: 0, filtered: false };
    let total = 0;
    let totalTime = 0;
    let filtered = false;
    // Reasonable pace thresholds (min/km) for each activity
    const paceThresholds: Record<string, { min: number; max: number }> = {
      hiking: { min: 6, max: 30 }, // ignore <6 (too fast), >30 (too slow)
      running: { min: 2.5, max: 20 }, // ignore <2.5 (world record), >20 (too slow)
      cycling: { min: 1, max: 10 }, // ignore <1 (too fast), >10 (too slow)
      rowing: { min: 1.5, max: 15 }, // ignore <1.5, >15
      track: { min: 2.5, max: 20 }, // use running thresholds
    };
    const { min, max } = paceThresholds[activityType] || { min: 2.5, max: 20 };
    for (let i = 1; i < trackPoints.length; i++) {
      const dist = calculateDistance(
        trackPoints[i - 1].latitude,
        trackPoints[i - 1].longitude,
        trackPoints[i].latitude,
        trackPoints[i].longitude
      );
      const timeSec = (trackPoints[i].timestamp - trackPoints[i - 1].timestamp) / 1000;
      if (dist > 0) {
        // const pace = (timeSec / 60) / dist; // min/km
        // // No filtering for 'track' type
        // if (activityType !== 'track' && (pace < min || pace > max)) {
        //   filtered = true;
        //   continue;
        // }
        total += dist;
        totalTime += timeSec;
      }
    }
    const avgPace = total > 0 ? (totalTime / 60) / total : 0;
    return { total, pace: avgPace, filtered };
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
    const { total } = getPaceAndFilteredDistance();
    return total.toFixed(2);
  };

  const getPaceDisplay = (): string => {
    const { pace, filtered } = getPaceAndFilteredDistance();
    if (!pace || pace === Infinity) return '-';
    const min = Math.floor(pace);
    const sec = Math.round((pace - min) * 60);
    return `${min}:${sec.toString().padStart(2, '0')} min/km` + (filtered ? ' (filtered)' : '');
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
              <p>Pace: {getPaceDisplay()}</p>
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

