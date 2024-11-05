import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Map } from '../components/Map';
import { TrackPoint } from '../utils/exportFormats';
import { getDoc, Doc } from "@junobuild/core";
import { parseGPX, parseKML, parseCSV } from '../utils/importFormats';
import "../styles/Track.css";
import { parse } from 'path';

interface TrackData {  
  filename: string;
  description: string;
  startime: string;
  distance: number;
  duration: number;
  elevationGain: number;
  trackfile: string;
}

export const Track: React.FC = () => {
  const { trackId } = useParams<{ trackId: string }>();
  const [track, setTrack] = useState<Doc<TrackData> | null>(null);
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  useEffect(() => {
    const fetchTrack = async () => {
      const trackDoc = await getDoc<TrackData>({
        collection: "tracks",
        key: trackId as string
      });
      
      if (trackDoc) {
        setTrack(trackDoc);
        
        const response = await fetch(trackDoc.data.trackfile);
        const content = await response.text();
        
        const fileExtension = trackDoc.data.trackfile.split('.').pop()?.toLowerCase();
        let points: TrackPoint[] = [];
        
        if (fileExtension === 'gpx') {
          points = parseGPX(content);
        } else if (fileExtension === 'kml') {
          points = parseKML(content);
        } else if (fileExtension === 'csv') {
          points = parseCSV(content);
        }
        
        setTrackPoints(points);
      }
    };

    fetchTrack();
  }, [trackId]);

  const TrackSummary = () => (
    <div className="track-summary">
      <h2>{track?.data.filename || 'Unnamed Track'}</h2>
      <p>{track?.data.description || ''}</p>
      <div className="track-stats">
      <div className="stat">
          <label>Start</label>
          <span>{(track?.data.startime || 0)} </span>
        </div>
        <div className="stat">
          <label>Distance</label>
          <span>{(track?.data.distance || 0)} km</span>
        </div>
        <div className="stat">
          <label>Duration</label>
          <span>{track?.data.duration || 0}</span>
        </div>
        <div className="stat">
          <label>Elevation Gain</label>
          <span>{track?.data.elevationGain.toFixed(0) || 0}m</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="track-page">
      {track ? (
        <>
          <TrackSummary />
          <div className="view-controls">
            <button 
              className={viewMode === 'map' ? 'active' : ''} 
              onClick={() => setViewMode('map')}
            >
              Map View
            </button>
            <button 
              className={viewMode === 'list' ? 'active' : ''} 
              onClick={() => setViewMode('list')}
            >
              List View
            </button>
          </div>
          <div className="track-view">
            {viewMode === 'map' && trackPoints.length > 0 ? (
              <Map 
                trackPoints={trackPoints}
                isTracking={false}
                onAddPoint={() => {}}
              />
            ) : (
              <div className="track-points-list">
                {trackPoints.map((point: TrackPoint, index: number) => (
                  <div key={index} className="track-point">
                    <span>{new Date(point.timestamp).toLocaleTimeString()}</span>
                    <span>{point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}</span>
                    <span>{point.elevation?.toFixed(2) || 0}m</span>
                     <span>{point.comment || " "}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div>Loading track data...</div>
      )}
    </div>
  );
};
