import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { useAlltracks, useGlobalContext } from '../components/Store';
import { Trackathon, TrackathonParticipant, TrackathonPoint, ActivityType } from '../types/Trackathon';
import { MintBadgeModal } from '../components/MintBadgeModal';
import '../styles/TrackathonDetail.css';

export const TrackathonDetail: React.FC = () => {
  const { trackathonId } = useParams<{ trackathonId: string }>();
  const navigate = useNavigate();
  const alltracks = useAlltracks();
  const { state: { principal } } = useGlobalContext();
  
  const [trackathon, setTrackathon] = useState<Trackathon | null>(null);
  const [participants, setParticipants] = useState<TrackathonParticipant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<TrackathonParticipant | null>(null);
  const [showMintModal, setShowMintModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrackathonData();
    // Auto-refresh every 30 seconds for live trackathons
    const interval = setInterval(loadTrackathonData, 30000);
    return () => clearInterval(interval);
  }, [trackathonId]);

  const loadTrackathonData = async () => {
    try {
      // TODO: Replace with actual API call
      // const trackathon = await alltracks.getTrackathon(trackathonId);
      // const participants = await alltracks.getTrackathonParticipants(trackathonId);
      
      // Mock data for now
      const mockTrackathon: Trackathon = {
        id: trackathonId!,
        name: trackathonId === '1' ? '24-Hour Hiking Marathon' : 
              trackathonId === '2' ? '12-Hour Running Challenge' : '8-Hour Cycling Sprint',
        description: trackathonId === '1' ? 
          'Register now! Once the trackathon starts, registered users can begin tracking anytime within the 24-hour window.' :
          trackathonId === '2' ?
          'Live now! Registered users can start tracking anytime before the window closes.' :
          'Completed challenge - view the leaderboard and participant routes.',
        startTime: trackathonId === '1' ? new Date('2025-12-10T08:00:00').getTime() :
                   trackathonId === '2' ? new Date('2025-11-28T06:00:00').getTime() :
                   new Date('2025-10-15T07:00:00').getTime(),
        endTime: trackathonId === '1' ? new Date('2025-12-11T08:00:00').getTime() :
                 trackathonId === '2' ? new Date('2025-11-28T18:00:00').getTime() :
                 new Date('2025-10-15T15:00:00').getTime(),
        duration: trackathonId === '1' ? 24 : trackathonId === '2' ? 12 : 8,
        activityType: (trackathonId === '1' ? 'hiking' : trackathonId === '2' ? 'running' : 'cycling') as ActivityType,
        registrations: ['user1', 'user2', 'user3', 'user4'],
        createdBy: 'admin',
        createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
      };

      // Mock participants data
      const mockParticipants: TrackathonParticipant[] = trackathonId === '3' ? [
        {
          principal: 'user1',
          username: 'Alice Runner',
          startedAt: new Date('2025-10-15T07:15:00').getTime(),
          totalDistance: 145.2,
          totalElevationGain: 1200,
          hasMintedBadge: true, // Alice has already minted her badge
          trackPoints: [
            { lat: 37.7749, lng: -122.4194, elevation: 50, timestamp: new Date('2025-10-15T07:15:00').getTime() },
            { lat: 37.7849, lng: -122.4094, elevation: 180, timestamp: new Date('2025-10-15T09:30:00').getTime(), note: 'Checkpoint 1' },
            { lat: 37.7949, lng: -122.3994, elevation: 520, timestamp: new Date('2025-10-15T11:45:00').getTime(), note: 'Halfway point' },
            { lat: 37.8049, lng: -122.3894, elevation: 850, timestamp: new Date('2025-10-15T14:00:00').getTime(), note: 'Final push' },
            { lat: 37.8149, lng: -122.3794, elevation: 1250, timestamp: new Date('2025-10-15T15:15:00').getTime() },
          ],
        },
        {
          principal: 'user2',
          username: 'Bob Cyclist',
          startedAt: new Date('2025-10-15T07:30:00').getTime(),
          totalDistance: 132.8,
          totalElevationGain: 980,
          hasMintedBadge: false, // Bob hasn't minted yet
          trackPoints: [
            { lat: 37.7649, lng: -122.4294, elevation: 40, timestamp: new Date('2025-10-15T07:30:00').getTime() },
            { lat: 37.7749, lng: -122.4194, elevation: 150, timestamp: new Date('2025-10-15T09:45:00').getTime() },
            { lat: 37.7849, lng: -122.4094, elevation: 380, timestamp: new Date('2025-10-15T12:00:00').getTime() },
            { lat: 37.7949, lng: -122.3994, elevation: 680, timestamp: new Date('2025-10-15T14:30:00').getTime() },
            { lat: 37.8049, lng: -122.3894, elevation: 1020, timestamp: new Date('2025-10-15T15:30:00').getTime() },
          ],
        },
        {
          principal: 'user7',
          username: 'Charlie Speed',
          startedAt: new Date('2025-10-15T08:00:00').getTime(),
          totalDistance: 118.5,
          totalElevationGain: 850,
          hasMintedBadge: false,
          trackPoints: [
            { lat: 37.7549, lng: -122.4394, elevation: 30, timestamp: new Date('2025-10-15T08:00:00').getTime() },
            { lat: 37.7649, lng: -122.4294, elevation: 120, timestamp: new Date('2025-10-15T10:00:00').getTime() },
            { lat: 37.7749, lng: -122.4194, elevation: 350, timestamp: new Date('2025-10-15T12:30:00').getTime() },
            { lat: 37.7849, lng: -122.4094, elevation: 580, timestamp: new Date('2025-10-15T15:00:00').getTime() },
            { lat: 37.7949, lng: -122.3994, elevation: 880, timestamp: new Date('2025-10-15T16:00:00').getTime() },
          ],
        },
      ] : trackathonId === '2' ? [
        {
          principal: 'user1',
          username: 'Alice Runner',
          startedAt: new Date('2025-11-28T08:00:00').getTime(),
          totalDistance: 45.2,
          totalElevationGain: 320,
          trackPoints: [
            { lat: 37.7749, lng: -122.4194, elevation: 50, timestamp: new Date('2025-11-28T08:00:00').getTime(), note: 'Start!' },
            { lat: 37.7849, lng: -122.4094, elevation: 180, timestamp: new Date('2025-11-28T10:15:00').getTime() },
            { lat: 37.7949, lng: -122.3994, elevation: 370, timestamp: Date.now() - 5000, note: 'Current position' },
          ],
        },
      ] : [];

      setTrackathon(mockTrackathon);
      setParticipants(mockParticipants.sort((a, b) => b.totalDistance - a.totalDistance));
      setLoading(false);
    } catch (error) {
      console.error('Failed to load trackathon:', error);
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      // TODO: Replace with actual API call
      // await alltracks.registerForTrackathon(trackathonId);
      alert('Successfully registered! You can start tracking once the trackathon begins.');
      loadTrackathonData();
    } catch (error) {
      console.error('Failed to register:', error);
      alert('Failed to register for trackathon');
    }
  };

  const handleStartTracking = async () => {
    try {
      // TODO: Replace with actual API call
      // await alltracks.startTrackathonTracking(trackathonId);
      navigate('/tracks'); // Navigate to tracking page
    } catch (error) {
      console.error('Failed to start tracking:', error);
      alert('Failed to start tracking');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  const getTrackathonStatus = () => {
    if (!trackathon) return 'unknown';
    const now = Date.now();
    
    if (now < trackathon.startTime) return 'upcoming';
    if (now >= trackathon.startTime && now < trackathon.endTime) return 'live';
    return 'completed';
  };

  const isUserRegistered = () => {
    return trackathon?.registrations.includes(principal?.toText() || '');
  };

  const getMapCenter = (): [number, number] => {
    if (selectedParticipant && selectedParticipant.trackPoints.length > 0) {
      const lastPoint = selectedParticipant.trackPoints[selectedParticipant.trackPoints.length - 1];
      return [lastPoint.lat, lastPoint.lng];
    }
    if (participants.length > 0 && participants[0].trackPoints.length > 0) {
      return [participants[0].trackPoints[0].lat, participants[0].trackPoints[0].lng];
    }
    return [37.7749, -122.4194]; // Default SF
  };

  if (loading) {
    return (
      <div className="trackathon-detail-container">
        <div className="loading">Loading trackathon...</div>
      </div>
    );
  }

  if (!trackathon) {
    return (
      <div className="trackathon-detail-container">
        <div className="error">Trackathon not found</div>
      </div>
    );
  }

  const status = getTrackathonStatus();
  const isRegistered = isUserRegistered();

  return (
    <div className="trackathon-detail-container">
      <div className="trackathon-header">
        <button className="back-button" onClick={() => navigate('/trackathons')}>
          <span className="material-icons">arrow_back</span>
          Back to Trackathons
        </button>
        
        <div className="header-content">
          <div className="title-row">
            <h1>{trackathon.name}</h1>
            <span className={`status-badge ${status}`}>
              {status === 'upcoming' ? 'Registration Open' : status === 'live' ? 'Live Now' : 'Completed'}
            </span>
          </div>
          <p className="description">{trackathon.description}</p>
        </div>
      </div>

      <div className="trackathon-info-grid">
        <div className="info-item">
          <span className="material-icons">event</span>
          <div>
            <strong>Start Time</strong>
            <span>{formatDate(trackathon.startTime)}</span>
          </div>
        </div>
        <div className="info-item">
          <span className="material-icons">event_available</span>
          <div>
            <strong>End Time</strong>
            <span>{formatDate(trackathon.endTime)}</span>
          </div>
        </div>
        <div className="info-item">
          <span className="material-icons">timer</span>
          <div>
            <strong>Duration</strong>
            <span>{trackathon.duration} hours</span>
          </div>
        </div>
        <div className="info-item">
          <span className="material-icons">
            {trackathon.activityType === 'hiking' ? 'hiking' : 
             trackathon.activityType === 'running' ? 'directions_run' :
             trackathon.activityType === 'cycling' ? 'directions_bike' :
             trackathon.activityType === 'rowing' ? 'rowing' : 'fitness_center'}
          </span>
          <div>
            <strong>Activity Type</strong>
            <span>{trackathon.activityType.charAt(0).toUpperCase() + trackathon.activityType.slice(1)}</span>
          </div>
        </div>
        <div className="info-item">
          <span className="material-icons">group</span>
          <div>
            <strong>Registered</strong>
            <span>{trackathon.registrations.length} participants</span>
          </div>
        </div>
      </div>

      {/* UPCOMING STATE - Registration */}
      {status === 'upcoming' && (
        <div className="registration-section">
          <div className="section-header">
            <h2>Registration</h2>
            {principal && !isRegistered && (
              <button className="register-button" onClick={handleRegister}>
                <span className="material-icons">how_to_reg</span>
                Register Now
              </button>
            )}
            {isRegistered && (
              <span className="registered-badge">
                <span className="material-icons">check_circle</span>
                You're Registered!
              </span>
            )}
          </div>
          <p className="info-text">
            Registration is open until the trackathon starts. Once it begins, registered users can start tracking anytime during the {trackathon.duration}-hour window.
          </p>
          <div className="registered-users">
            <h3>Registered Participants ({trackathon.registrations.length})</h3>
            <div className="user-list">
              {trackathon.registrations.map((userId, idx) => (
                <div key={userId} className="user-item">
                  <span className="material-icons">person</span>
                  <span>Participant {idx + 1}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LIVE STATE - Track Points */}
      {status === 'live' && (
        <div className="live-section">
          <div className="section-header">
            <h2>Live Tracking</h2>
            {principal && isRegistered && (
              <button className="start-button" onClick={handleStartTracking}>
                <span className="material-icons">play_arrow</span>
                Start Tracking
              </button>
            )}
          </div>

          <p className="info-text">
            Recording ends at {formatDate(trackathon.endTime)}. After this time, no more track points can be recorded.
          </p>

          {participants.length === 0 ? (
            <p className="info-text">No participants have started tracking yet. Be the first!</p>
          ) : (
            <div className="two-column-layout">
              <div className="left-column">
                <h3>Active Participants</h3>
                <div className="participants-list">
                  {participants.map((participant) => {
                    const lastPoint = participant.trackPoints[participant.trackPoints.length - 1];
                    return (
                      <div key={participant.principal} className="participant-item">
                        <div className="participant-header">
                          <span className="material-icons">person</span>
                          <strong>{participant.username}</strong>
                        </div>
                        <div className="participant-stats">
                          <div className="stat-item">
                            <span className="material-icons">straighten</span>
                            <span>{participant.totalDistance.toFixed(2)} km</span>
                          </div>
                          <div className="stat-item">
                            <span className="material-icons">terrain</span>
                            <span>{participant.totalElevationGain} m</span>
                          </div>
                        </div>
                        {lastPoint && (
                          <div className="current-location">
                            <span className="material-icons">location_on</span>
                            <div className="location-info">
                              <span className="location-label">Current Location</span>
                              <span className="location-coords">
                                {lastPoint.lat.toFixed(4)}, {lastPoint.lng.toFixed(4)}
                              </span>
                              <span className="location-time">{formatTime(lastPoint.timestamp)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="right-column">
                <h3>Live Map - All Routes</h3>
                <div className="map-container">
                  <MapContainer
                    center={getMapCenter()}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    {participants.map((participant, pIdx) => (
                      <React.Fragment key={participant.principal}>
                        <Polyline
                          positions={participant.trackPoints.map(p => [p.lat, p.lng])}
                          color={['#007bff', '#28a745', '#ffc107', '#dc3545', '#6f42c1'][pIdx % 5]}
                          weight={3}
                          opacity={0.7}
                        />
                        {participant.trackPoints.map((point, idx) => (
                          <Marker key={`${participant.principal}-${idx}`} position={[point.lat, point.lng]}>
                            <Popup>
                              <strong>{participant.username}</strong><br />
                              Point {idx + 1}<br />
                              Lat: {point.lat.toFixed(6)}, Lng: {point.lng.toFixed(6)}<br />
                              Elevation: {point.elevation}m<br />
                              {formatTime(point.timestamp)}<br />
                              {point.note && <em>{point.note}</em>}
                            </Popup>
                          </Marker>
                        ))}
                      </React.Fragment>
                    ))}
                  </MapContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* COMPLETED STATE - Leaderboard */}
      {status === 'completed' && (
        <div className="completed-section">
          <div className="section-header">
            <h2>Final Results</h2>
            {principal && participants.some(p => p.principal === principal.toText() && !p.hasMintedBadge) && (
              <button 
                className="mint-badge-button" 
                onClick={() => setShowMintModal(true)}
              >
                <span className="material-icons">auto_awesome</span>
                Mint Completion Badge
              </button>
            )}
          </div>

          {participants.length === 0 ? (
            <p className="info-text">No participants completed this trackathon.</p>
          ) : (
            <div className="two-column-layout">
              <div className="left-column">
                <h3>Leaderboard</h3>
                <div className="leaderboard">
                  {participants.map((participant, idx) => (
                    <div 
                      key={participant.principal} 
                      className={`leaderboard-item ${selectedParticipant?.principal === participant.principal ? 'selected' : ''}`}
                      onClick={() => setSelectedParticipant(
                        selectedParticipant?.principal === participant.principal ? null : participant
                      )}
                    >
                      <div className="leaderboard-rank">
                        {idx === 0 && <span className="material-icons gold">emoji_events</span>}
                        {idx === 1 && <span className="material-icons silver">emoji_events</span>}
                        {idx === 2 && <span className="material-icons bronze">emoji_events</span>}
                        {idx > 2 && <span className="rank-number">#{idx + 1}</span>}
                      </div>
                      <div className="leaderboard-content">
                        <div className="leaderboard-name">
                          {participant.username}
                          {participant.hasMintedBadge && (
                            <span className="badge-minted-icon" title="Badge NFT Minted">
                              <span className="material-icons">verified</span>
                            </span>
                          )}
                        </div>
                        <div className="leaderboard-stats">
                          <span className="stat-item">
                            <span className="material-icons">straighten</span>
                            {participant.totalDistance.toFixed(2)} km
                          </span>
                          <span className="stat-item">
                            <span className="material-icons">terrain</span>
                            {participant.totalElevationGain} m
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="right-column">
                <h3>{selectedParticipant ? `${selectedParticipant.username}'s Route` : 'Select a Participant'}</h3>
                <div className="map-container">
                  {selectedParticipant ? (
                    <MapContainer
                      key={selectedParticipant.principal}
                      center={[
                        selectedParticipant.trackPoints[Math.floor(selectedParticipant.trackPoints.length / 2)]?.lat || 37.7749,
                        selectedParticipant.trackPoints[Math.floor(selectedParticipant.trackPoints.length / 2)]?.lng || -122.4194
                      ]}
                      zoom={12}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      />
                      <Polyline
                        positions={selectedParticipant.trackPoints.map(p => [p.lat, p.lng])}
                        color="#007bff"
                        weight={4}
                      />
                      {selectedParticipant.trackPoints.map((point, idx) => (
                        <Marker key={idx} position={[point.lat, point.lng]}>
                          <Popup>
                            <strong>Point {idx + 1}</strong><br />
                            Lat: {point.lat.toFixed(6)}, Lng: {point.lng.toFixed(6)}<br />
                            Elevation: {point.elevation}m<br />
                            {formatTime(point.timestamp)}<br />
                            {point.note && <em>{point.note}</em>}
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  ) : (
                    <div className="map-placeholder">
                      <span className="material-icons">map</span>
                      <p>Click on a participant to view their route</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mint Badge Modal */}
      {showMintModal && trackathon && principal && (
        <MintBadgeModal
          trackathon={trackathon}
          participant={participants.find(p => p.principal === principal.toText())!}
          rank={participants.findIndex(p => p.principal === principal.toText()) + 1}
          onClose={() => setShowMintModal(false)}
          onMinted={() => {
            loadTrackathonData();
          }}
        />
      )}
    </div>
  );
};
