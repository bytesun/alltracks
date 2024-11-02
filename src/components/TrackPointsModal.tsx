import React from 'react';
import { TrackPoint } from '../utils/exportFormats';
import './TrackPointsModal.css';

interface TrackPointsModalProps {
  points: TrackPoint[];
  onClose: () => void;
}

export const TrackPointsModal = ({ points, onClose }: TrackPointsModalProps) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content track-points-modal">
        <h3>Track Points</h3>
        <div className="points-list">
          {points.map((point, index) => (
            <div key={point.timestamp} className="point-item">
              <div className="point-time">
                {new Date(point.timestamp).toLocaleString()}
              </div>
              <div className="point-location">
                {point.latitude.toFixed(6)}, {point.longitude.toFixed(6)}
              </div>
              <div className="point-elevation">
                Elevation: {point.elevation?.toFixed(1) || '-'} m
              </div>
              {point.comment && (
                <div className="point-comment">
                  {point.comment}
                </div>
              )}
            </div>
          ))}
        </div>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
};