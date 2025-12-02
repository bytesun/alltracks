import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import html2canvas from 'html2canvas';
import { TrackathonParticipant, Trackathon, TrackathonBadge } from '../types/Trackathon';
import { useAlltracks } from './Store';
import '../styles/MintBadgeModal.css';

interface MintBadgeModalProps {
  trackathon: Trackathon;
  participant: TrackathonParticipant;
  rank: number;
  onClose: () => void;
  onMinted: () => void;
}

export const MintBadgeModal: React.FC<MintBadgeModalProps> = ({
  trackathon,
  participant,
  rank,
  onClose,
  onMinted,
}) => {
  const alltracks = useAlltracks();
  const [isMinting, setIsMinting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate preview after component mounts
    setTimeout(generatePreview, 1000);
  }, []);

  const generatePreview = async () => {
    if (!badgeRef.current) return;

    try {
      const canvas = await html2canvas(badgeRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      });
      const imageData = canvas.toDataURL('image/png');
      setPreview(imageData);
    } catch (error) {
      console.error('Failed to generate preview:', error);
    }
  };

  const handleMint = async () => {
    setIsMinting(true);
    try {
      // Generate the badge image
      if (!badgeRef.current) {
        throw new Error('Badge reference not found');
      }

      const canvas = await html2canvas(badgeRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
      });
      const routeImage = canvas.toDataURL('image/png');

      const badgeData: TrackathonBadge = {
        trackathonId: trackathon.id,
        trackathonName: trackathon.name,
        participantPrincipal: participant.principal,
        participantName: participant.username,
        completionDate: trackathon.endTime,
        distance: participant.totalDistance,
        elevationGain: participant.totalElevationGain,
        duration: trackathon.duration,
        activityType: trackathon.activityType,
        routeImage,
        rank,
      };

      // TODO: Replace with actual API call to mint NFT
      // const result = await alltracks.mintTrackathonBadge(trackathon.id, badgeData);
      
      console.log('Minting badge NFT:', badgeData);
      
      // Simulate minting delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      alert('Badge NFT minted successfully! Check your wallet.');
      onMinted();
      onClose();
    } catch (error) {
      console.error('Failed to mint badge:', error);
      alert('Failed to mint badge. Please try again.');
    } finally {
      setIsMinting(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getRankMedal = () => {
    if (rank === 1) return { emoji: '🥇', color: '#FFD700', label: '1st Place' };
    if (rank === 2) return { emoji: '🥈', color: '#C0C0C0', label: '2nd Place' };
    if (rank === 3) return { emoji: '🥉', color: '#CD7F32', label: '3rd Place' };
    return { emoji: '🏅', color: '#4CAF50', label: `${rank}th Place` };
  };

  const getMapBounds = () => {
    if (participant.trackPoints.length === 0) return undefined;
    
    const lats = participant.trackPoints.map(p => p.lat);
    const lngs = participant.trackPoints.map(p => p.lng);
    
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    ] as [[number, number], [number, number]];
  };

  const medal = getRankMedal();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content mint-badge-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🏆 Mint Completion Badge NFT</h2>
          <button className="close-button" onClick={onClose}>
            <span className="material-icons">close</span>
          </button>
        </div>

        <div className="modal-body">
          <p className="info-text">
            Congratulations on completing <strong>{trackathon.name}</strong>! 
            Mint your achievement as an NFT badge featuring your route map and stats.
          </p>

          <div className="badge-preview-container">
            <div className="badge-preview" ref={badgeRef}>
              <div className="badge-header" style={{ background: `linear-gradient(135deg, ${medal.color}, ${medal.color}dd)` }}>
                <div className="badge-medal">{medal.emoji}</div>
                <div className="badge-rank">{medal.label}</div>
              </div>

              <div className="badge-title">
                <h3>{trackathon.name}</h3>
                <p className="badge-date">{formatDate(trackathon.endTime)}</p>
              </div>

              <div className="badge-map">
                {participant.trackPoints.length > 0 && (
                  <MapContainer
                    bounds={getMapBounds()}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                    attributionControl={false}
                    dragging={false}
                    scrollWheelZoom={false}
                    doubleClickZoom={false}
                    touchZoom={false}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Polyline
                      positions={participant.trackPoints.map(p => [p.lat, p.lng])}
                      color={medal.color}
                      weight={4}
                    />
                  </MapContainer>
                )}
              </div>

              <div className="badge-stats">
                <div className="stat-item">
                  <span className="stat-icon">📍</span>
                  <span className="stat-value">{participant.totalDistance.toFixed(2)} km</span>
                  <span className="stat-label">Distance</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">⛰️</span>
                  <span className="stat-value">{participant.totalElevationGain} m</span>
                  <span className="stat-label">Elevation</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">⏱️</span>
                  <span className="stat-value">{trackathon.duration}h</span>
                  <span className="stat-label">Duration</span>
                </div>
              </div>

              <div className="badge-footer">
                <div className="badge-participant">
                  <span className="material-icons">person</span>
                  <span>{participant.username}</span>
                </div>
                <div className="badge-activity">
                  <span className="material-icons">
                    {trackathon.activityType === 'hiking' ? 'hiking' : 
                     trackathon.activityType === 'running' ? 'directions_run' :
                     trackathon.activityType === 'cycling' ? 'directions_bike' :
                     trackathon.activityType === 'rowing' ? 'rowing' : 'fitness_center'}
                  </span>
                  <span>{trackathon.activityType.charAt(0).toUpperCase() + trackathon.activityType.slice(1)}</span>
                </div>
              </div>

              <div className="badge-watermark">
                <span>SunTrack Trackathon</span>
              </div>
            </div>
          </div>

          {preview && (
            <div className="preview-note">
              <span className="material-icons">info</span>
              <span>This is how your NFT badge will look. It will be minted to your wallet.</span>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button 
            className="cancel-button" 
            onClick={onClose}
            disabled={isMinting}
          >
            Cancel
          </button>
          <button 
            className="mint-button" 
            onClick={handleMint}
            disabled={isMinting}
          >
            {isMinting ? (
              <>
                <span className="spinner"></span>
                Minting...
              </>
            ) : (
              <>
                <span className="material-icons">auto_awesome</span>
                Mint NFT Badge
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
