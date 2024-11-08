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
        <div className="modal-header">
          <h3>Track Points</h3>
          <button className="close-icon" onClick={onClose}>×</button>
        </div>
        <div className="points-list">
          {[...points].reverse().map((point, index) => (
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
              {point.photo && (
                <div className="point-photo">
                  <img
                    src={point.photo}
                    alt="Point photo"
                    style={{
                      width: '200px',
                      maxHeight: '200px',
                      objectFit: 'cover',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      marginTop: '8px'
                    }}
                    onClick={() => window.open(point.photo, '_blank')}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};