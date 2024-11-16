import React from 'react';
import { TrackPoint } from '../types/TrackPoint';

interface TrackListViewProps {
  trackPoints: TrackPoint[];
}

export const TrackListView: React.FC<TrackListViewProps> = ({ trackPoints }) => {
  return (
    <div className="list-container">
      <table className="points-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Latitude</th>
            <th>Longitude</th>
            <th>Elevation</th>
            <th>Comment</th>
          </tr>
        </thead>
        <tbody>
          {trackPoints.map((point) => (
            <tr key={point.timestamp}>
              <td>{new Date(point.timestamp).toLocaleTimeString()}</td>
              <td>{point.latitude.toFixed(6)}</td>
              <td>{point.longitude.toFixed(6)}</td>
              <td>{point.elevation?.toFixed(1) || '-'}</td>
              <td>{point.comment || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
