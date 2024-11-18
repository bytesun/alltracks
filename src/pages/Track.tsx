import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Map } from '../components/Map';
import { TrackPoint } from "../types/TrackPoint";
import { getDoc, Doc } from "@junobuild/core";
import { parseGPX, parseKML, parseCSV } from '../utils/importFormats';
import { Track } from '../types/Track';
import "../styles/Track.css";
import { Navbar } from '../components/Navbar';


export const TrackPage: React.FC = () => {
  const { trackId } = useParams<{ trackId: string }>();
  const [track, setTrack] = useState<Doc<Track> | null>(null);
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  useEffect(() => {
    
    const fetchTrack = async () => {
      const trackDoc = await getDoc<Track>({
        collection: "tracks",
        key: trackId as string
      });

      if (trackDoc) {
        setTrack(trackDoc);
        

      }
    };

    fetchTrack();
  }, [trackId]);

  useEffect(() => {
    const fetchTrackPoints = async () => {

      if (track) {
        const response = await fetch(track.data.trackfile);
        const content = await response.text();

        const fileExtension = track.data.trackfile.split('.').pop()?.toLowerCase();
        console.log("File extension:", fileExtension);
        let points: TrackPoint[] = [];

        if (fileExtension === 'gpx') {
          points = parseGPX(content);
        } else if (fileExtension === 'kml') {
          points = parseKML(content);
        } else if (fileExtension === 'csv') {
          points = parseCSV(content);
        } else {
          points = parseCSV(content);
        }
        console.log("Track points:", points);
        setTrackPoints(points);
      }
    };
    fetchTrackPoints();
  }, [track]);

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
          <span>{(track?.data.distance.toFixed(2) || 0)} km</span>
        </div>
        <div className="stat">
          <label>Duration</label>
          <span>{track?.data.duration.toFixed(2) || 0} hrs</span>
        </div>
        <div className="stat">
          <label>Elevation Gain</label>
          <span>{track?.data.elevationGain.toFixed(0) || 0}m</span>
        </div>

      </div>
    </div>
  );

  return (

    <>
      <Navbar />
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
            <div className="track-view" style={{ height: 'calc(100vh - 200px)', width: '100%' }}>
              {viewMode === 'map' && trackPoints.length > 0 ? (
                <Map
                  trackPoints={trackPoints}
                  isTracking={false}
                  onAddPoint={() => { }}
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
    </>
  );
};
