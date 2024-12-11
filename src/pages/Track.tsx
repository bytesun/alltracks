import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Map } from '../components/Map';
import { TrackPoint } from "../types/TrackPoint";

import { parseGPX, parseKML, parseCSV } from '../utils/importFormats';
import { Track } from '../types/Track';
import "../styles/Track.css";

import { useAlltracks } from '../components/Store';
import { parseTracks } from '../utils/trackUtils';
import { FILETYPE_GPX , FILETYPE_KML} from '../lib/constants';
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

  // Add ref for the track points container
  const pointsListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPlaying) {
      const activePoint = pointsListRef.current?.querySelector('.track-point.active');
      activePoint?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentPointIndex, isPlaying]);

  return (
    <div className="track-page two-column">
      <div className="left-column">
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

      <div className="right-column">
      <MapWrapper layout="track">
        <Map
          trackPoints={trackPoints}
          isTracking={false}
          onAddPoint={() => {}}
          currentPoint={trackPoints[currentPointIndex]}
          isPlayback={isPlaying}
        />
        </MapWrapper>
      </div>
    </div>
  );
};
