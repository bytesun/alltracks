import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Map } from '../components/Map';
import { TrackPoint } from "../types/TrackPoint";

import { parseGPX, parseKML, parseCSV } from '../utils/importFormats';
import { Track } from '../types/Track';
import "../styles/Track.css";

import { useAlltracks } from '../components/Store';
import { parseTracks } from '../utils/trackUtils';
import { FILETYPE_GPX, FILETYPE_KML } from '../lib/constants';
import { MapWrapper } from '../components/MapWrapper';
export const TrackPage: React.FC = () => {

  const alltracks = useAlltracks();

  const { trackId } = useParams<{ trackId: string }>();
  const [track, setTrack] = useState<Track | null>(null);
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    if (isPlaying) {
      const activePoint = document.querySelector('.track-point.active');
      activePoint?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentPointIndex, isPlaying]);

  useEffect(() => {

    const fetchTrack = async () => {
      const track = await alltracks.getTrack(trackId);
      if (track.length > 0) {
        console.log("Track:", track[0]);
        const parsrsedTracks = parseTracks(track);

        setTrack(parsrsedTracks[0]);
      }
    };

    fetchTrack();

  }, [trackId]);

  useEffect(() => {
    const fetchTrackPoints = async () => {

      if (track) {
        const response = await fetch(track.trackfile.url);
        const content = await response.text();

        let points: TrackPoint[] = [];

        if (track.trackfile.fileType === FILETYPE_GPX) {
          points = parseGPX(content);
        } else if (track.trackfile.fileType === FILETYPE_KML) {
          points = parseKML(content);

        } else {
          points = parseCSV(content);
        }

        setTrackPoints(points);
      }
    };
    fetchTrackPoints();
  }, [track]);


  const TrackSummary = () => (
    <div className="track-summary">
      <h2>{track?.name || 'Unnamed Track'}</h2>
      <p>{track?.description || ''}</p>
      <div className="track-stats">
        <div className="stat">
          <label>Date</label>
          <span>{(new Date(track?.startime).toLocaleDateString() || 0)} </span>
        </div>
        <div className="stat">
          <label>Distance</label>
          <span>{(track?.length.toFixed(2) || 0)} km</span>
        </div>
        <div className="stat">
          <label>Duration</label>
          <span>{track?.duration.toFixed(2) || 0} hrs</span>
        </div>
        <div className="stat">
          <label>Elevation Gain</label>
          <span>{track?.elevation.toFixed(0) || 0}m</span>
        </div>

      </div>
    </div>
  );

  const startPlayback = () => {
    setIsPlaying(true);
    const interval = setInterval(() => {
      setCurrentPointIndex(prev => {
        if (prev >= trackPoints.length - 1) {
          setIsPlaying(false);
          clearInterval(interval);
          return 0;
        }
        return prev + 1;
      });
    }, 1000 / playbackSpeed);
  };
  const pausePlayback = () => {
    setIsPlaying(false);
  };

  const resetPlayback = () => {
    setCurrentPointIndex(0);
    setIsPlaying(false);
  };

  const downloadTrackAsGPX = () => {
    if (trackPoints.length === 0) return;

    const gpxHeader = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="AllTracks" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${track?.name || 'Track'}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${track?.name || 'Track'}</name>
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
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${track?.name || 'track'}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadTrackAsJSON = () => {
    if (trackPoints.length === 0) return;

    const jsonData = {
      name: track?.name,
      description: track?.description,
      exportDate: new Date().toISOString(),
      stats: {
        distance: track?.length,
        duration: track?.duration,
        elevation: track?.elevation,
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
    a.download = `${track?.name || 'track'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Add ref for the track points container
  const pointsListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPlaying) {
      const activePoint = pointsListRef.current?.querySelector('.track-point.active');
      activePoint?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentPointIndex, isPlaying]);
  return (
    <div className="track-page">
      <div className="track-left">
        <TrackSummary />

        <div className="playback-controls">
          <button onClick={isPlaying ? pausePlayback : startPlayback}>
            <span className="material-icons">{isPlaying ? 'pause' : 'play_arrow'}</span>
          </button>
          <button onClick={resetPlayback}>
            <span className="material-icons">replay</span>
          </button>
          <select value={playbackSpeed} onChange={(e) => setPlaybackSpeed(Number(e.target.value))}>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
          <button
            onClick={downloadTrackAsGPX}
            disabled={trackPoints.length === 0}
            title="Download track as GPX"
            style={{
              padding: '6px 12px',
              background: '#2196F3',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: trackPoints.length > 0 ? 'pointer' : 'not-allowed',
              opacity: trackPoints.length > 0 ? 1 : 0.5,
              fontSize: 12,
              marginLeft: 8,
            }}
          >
            <span className="material-icons" style={{ fontSize: 18 }}>download</span>
            GPX
          </button>
          <button
            onClick={downloadTrackAsJSON}
            disabled={trackPoints.length === 0}
            title="Download track as JSON"
            style={{
              padding: '6px 12px',
              background: '#4CAF50',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: trackPoints.length > 0 ? 'pointer' : 'not-allowed',
              opacity: trackPoints.length > 0 ? 1 : 0.5,
              fontSize: 12,
              marginLeft: 4,
            }}
          >
            <span className="material-icons" style={{ fontSize: 18 }}>download</span>
            JSON
          </button>
        </div>

        <div className="track-points-container" ref={pointsListRef}>
          {trackPoints.map((point: TrackPoint, index: number) => (
            <div
              key={index}
              className={`track-point ${currentPointIndex === index ? 'active' : ''}`}
            >
              <span>{new Date(point.timestamp).toLocaleTimeString()}</span>
              <span>{point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}</span>
              <span>{point.elevation?.toFixed(2) || 0}m</span>
              <span>{point.comment || " "}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="track-right">
        <MapWrapper layout="track">
          <Map
            trackPoints={trackPoints}
            isTracking={false}
            onAddPoint={() => { }}
            currentPoint={trackPoints[currentPointIndex]}
            isPlayback={isPlaying}
          />
        </MapWrapper>
      </div>
    </div>
  );
};