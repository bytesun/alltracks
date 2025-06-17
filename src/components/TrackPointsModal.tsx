import React, { useState } from 'react';
import { TrackPoint } from '../types/TrackPoint';
import './TrackPointsModal.css';

interface TrackPointsModalProps {
  points: TrackPoint[];
  onClose: () => void;
  onRemove?: (timestamp: number) => void; // Add optional onRemove prop
}

export const TrackPointsModal = ({ points, onClose, onRemove }: TrackPointsModalProps) => {
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null);

  const handleRemove = (timestamp: number) => {
    setConfirmRemove(timestamp);
  };

  const confirmRemovePoint = () => {
    if (onRemove && confirmRemove !== null) {
      onRemove(confirmRemove);
      setConfirmRemove(null);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content track-points-modal" style={{ position: 'relative' }}>
        <div className="modal-header" style={{ position: 'relative', paddingRight: 40 }}>
          <h3>Track Points</h3>
          <button
            className="close-icon"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'none',
              border: 'none',
              color: '#333',
              fontSize: 24,
              cursor: 'pointer',
              padding: 0,
              lineHeight: 1,
              zIndex: 10
            }}
            title="Close"
          >
            ×
          </button>
        </div>
        <div className="points-list">
          {[...points].reverse().map((point, index) => (
            <div key={point.timestamp} className="point-item" style={{ position: 'relative' }}>
              {onRemove && (
                <button
                  className="remove-point-x"
                  onClick={() => handleRemove(point.timestamp)}
                  title="Remove checkpoint"
                  style={{ position: 'absolute', top: 4, right: 4, background: 'none', border: 'none', color: '#c00', fontSize: 18, cursor: 'pointer', padding: 0, lineHeight: 1, zIndex: 2 }}
                >
                  ×
                </button>
              )}
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
        {confirmRemove !== null && (
          <div className="confirm-remove-modal" style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', padding: 24, borderRadius: 8, minWidth: 260, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
              <p>Are you sure you want to remove this checkpoint?</p>
              <button onClick={confirmRemovePoint} style={{ marginRight: 12, color: '#fff', background: '#c00', border: 'none', borderRadius: 4, padding: '6px 16px', cursor: 'pointer' }}>Remove</button>
              <button onClick={() => setConfirmRemove(null)} style={{ color: '#333', background: '#eee', border: 'none', borderRadius: 4, padding: '6px 16px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};