import React, { useState, useEffect } from 'react';
import { useAlltracks, useGlobalContext } from './Store';
import { Trackathon, TrackathonParticipant } from '../types/Trackathon';
import '../styles/Wallet.css';

export const Wallet: React.FC = () => {
  const alltracks = useAlltracks();
  const { state: { principal } } = useGlobalContext();
  const [badges, setBadges] = useState<Array<{ trackathon: Trackathon, participant: TrackathonParticipant, rank: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (principal) {
      loadBadges();
    }
  }, [principal]);

  const loadBadges = async () => {
    try {
      setLoading(true);
      // Get user's trackathons
      const myTrackathons = await alltracks.getMyTrackathons();
      
      const badgeData = [];
      
      for (const t of myTrackathons) {
        // Get participants for this trackathon
        const participants = await alltracks.getTrackathonParticipants(t.id);
        
        // Find current user in participants
        const userParticipant = participants.find(p => p.principal.toText() === principal.toText());
        
        // Only include if user has minted the badge
        if (userParticipant && userParticipant.hasMintedBadge) {
          // Calculate rank (sort by distance, then elevation)
          const sortedParticipants = [...participants].sort((a, b) => {
            if (b.totalDistance !== a.totalDistance) {
              return b.totalDistance - a.totalDistance;
            }
            return b.totalElevationGain - a.totalElevationGain;
          });
          
          const rank = sortedParticipants.findIndex(p => p.principal.toText() === principal.toText()) + 1;
          
          // Format trackathon
          const formattedTrackathon: Trackathon = {
            id: t.id,
            name: t.name,
            description: t.description,
            startTime: Number(t.startTime) / 1000000,
            endTime: Number(t.endTime) / 1000000,
            duration: t.duration,
            activityType: Object.keys(t.activityType)[0] as any,
            registrations: t.registrations.map(p => p.toText()),
            createdBy: t.createdBy.toText(),
            createdAt: Number(t.createdAt) / 1000000,
            groupId: t.groupId.length > 0 ? t.groupId[0] : undefined,
          };
          
          // Format participant
          const formattedParticipant: TrackathonParticipant = {
            principal: userParticipant.principal.toText(),
            username: userParticipant.username,
            startedAt: userParticipant.startedAt.length > 0 ? Number(userParticipant.startedAt[0]) / 1000000 : undefined,
            totalDistance: userParticipant.totalDistance,
            totalElevationGain: userParticipant.totalElevationGain,
            hasMintedBadge: userParticipant.hasMintedBadge,
            trackPoints: userParticipant.trackPoints.map(point => ({
              lat: point.lat,
              lng: point.lng,
              elevation: point.elevation.length > 0 ? point.elevation[0] : undefined,
              timestamp: Number(point.timestamp) / 1000000,
              note: point.note.length > 0 ? point.note[0] : undefined,
            })),
          };
          
          badgeData.push({
            trackathon: formattedTrackathon,
            participant: formattedParticipant,
            rank
          });
        }
      }
      
      // Sort by completion date (most recent first)
      badgeData.sort((a, b) => b.trackathon.endTime - a.trackathon.endTime);
      
      setBadges(badgeData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load badges:', error);
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getRankMedal = (rank: number) => {
    if (rank === 1) return { emoji: '🥇', color: '#FFD700', label: '1st' };
    if (rank === 2) return { emoji: '🥈', color: '#C0C0C0', label: '2nd' };
    if (rank === 3) return { emoji: '🥉', color: '#CD7F32', label: '3rd' };
    return { emoji: '🏅', color: '#4CAF50', label: `${rank}th` };
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'hiking': return 'hiking';
      case 'running': return 'directions_run';
      case 'cycling': return 'directions_bike';
      case 'rowing': return 'rowing';
      default: return 'place';
    }
  };

  if (!principal) {
    return (
      <div className="wallet-container">
        <div className="wallet-empty">
          <span className="material-icons">account_balance_wallet</span>
          <p>Please sign in to view your NFT badges</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="wallet-container">
        <div className="wallet-loading">
          <div className="spinner"></div>
          <p>Loading your badges...</p>
        </div>
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className="wallet-container">
        <div className="wallet-empty">
          <span className="material-icons">emoji_events</span>
          <p>You haven't minted any trackathon badges yet.</p>
          <p className="hint">Complete a trackathon and mint your badge to add it to your collection!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-container">
      <div className="badges-grid">
        {badges.map(({ trackathon, participant, rank }) => {
          const medal = getRankMedal(rank);
          
          return (
            <div key={trackathon.id} className="badge-card">
              <div 
                className="badge-card-header" 
                style={{ background: `linear-gradient(135deg, ${medal.color}, ${medal.color}dd)` }}
              >
                <div className="badge-medal">{medal.emoji}</div>
                <div className="badge-rank-label">{medal.label} Place</div>
              </div>

              <div className="badge-card-body">
                <div className="badge-activity-icon">
                  <span className="material-icons">{getActivityIcon(trackathon.activityType)}</span>
                </div>
                
                <h3 className="badge-title">{trackathon.name}</h3>
                <p className="badge-date">{formatDate(trackathon.endTime)}</p>

                <div className="badge-stats">
                  <div className="stat-item">
                    <span className="material-icons">straighten</span>
                    <div className="stat-content">
                      <span className="stat-label">Distance</span>
                      <span className="stat-value">{participant.totalDistance.toFixed(2)} km</span>
                    </div>
                  </div>
                  
                  <div className="stat-item">
                    <span className="material-icons">terrain</span>
                    <div className="stat-content">
                      <span className="stat-label">Elevation</span>
                      <span className="stat-value">{participant.totalElevationGain.toFixed(0)} m</span>
                    </div>
                  </div>
                  
                  <div className="stat-item">
                    <span className="material-icons">schedule</span>
                    <div className="stat-content">
                      <span className="stat-label">Duration</span>
                      <span className="stat-value">{trackathon.duration}h</span>
                    </div>
                  </div>
                </div>

                <div className="badge-footer">
                  <div className="badge-verified">
                    <span className="material-icons">verified</span>
                    <span>NFT Minted</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
