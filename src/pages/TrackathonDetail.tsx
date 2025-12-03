import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { useAlltracks, useGlobalContext } from '../components/Store';
import { Trackathon, TrackathonParticipant, TrackathonPoint, ActivityType } from '../types/Trackathon';
import { MintBadgeModal } from '../components/MintBadgeModal';
import { useNotification } from '../context/NotificationContext';
import '../styles/TrackathonDetail.css';

export const TrackathonDetail: React.FC = () => {
  const { trackathonId } = useParams<{ trackathonId: string }>();
  const navigate = useNavigate();
  const alltracks = useAlltracks();
  const { state: { principal } } = useGlobalContext();
  const { showNotification } = useNotification();
  
  const [trackathon, setTrackathon] = useState<Trackathon | null>(null);
  const [participants, setParticipants] = useState<TrackathonParticipant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<TrackathonParticipant | null>(null);
  const [showMintModal, setShowMintModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [recordNote, setRecordNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSavingPoint, setIsSavingPoint] = useState(false);

  useEffect(() => {
    loadTrackathonData();
    // Auto-refresh every 10 seconds
    const interval = setInterval(loadTrackathonData, 10000);
    return () => clearInterval(interval);
  }, [trackathonId]);

  // Auto-select first participant for completed trackathons
  useEffect(() => {
    if (trackathon && participants.length > 0) {
      const now = Date.now();
      const isCompleted = now >= trackathon.endTime;
      if (isCompleted && !selectedParticipant) {
        setSelectedParticipant(participants[0]);
      }
    }
  }, [trackathon, participants]);

  const loadTrackathonData = async () => {
    try {
      // Get trackathon details
      const trackathonResult = await alltracks.getTrackathon(trackathonId!);
      
      if (!trackathonResult || trackathonResult.length === 0) {
        setLoading(false);
        return;
      }
      
      const t = trackathonResult[0];
      const formattedTrackathon: Trackathon = {
        id: t.id,
        name: t.name,
        description: t.description,
        startTime: Number(t.startTime) / 1000000,
        endTime: Number(t.endTime) / 1000000,
        duration: t.duration,
        activityType: Object.keys(t.activityType)[0] as ActivityType,
        registrations: t.registrations.map(p => p.toText()),
        createdBy: t.createdBy.toText(),
        createdAt: Number(t.createdAt) / 1000000,
        groupId: t.groupId.length > 0 ? t.groupId[0] : undefined,
      };

      // Get participants
      const participantsResult = await alltracks.getTrackathonParticipants(trackathonId!);
      
      const formattedParticipants: TrackathonParticipant[] = participantsResult.map(p => ({
        principal: p.principal.toText(),
        username: p.username,
        startedAt: p.startedAt.length > 0 ? Number(p.startedAt[0]) / 1000000 : undefined,
        totalDistance: p.totalDistance,
        totalElevationGain: p.totalElevationGain,
        hasMintedBadge: p.hasMintedBadge,
        trackPoints: p.trackPoints.map(point => ({
          lat: point.lat,
          lng: point.lng,
          elevation: point.elevation.length > 0 ? point.elevation[0] : undefined,
          timestamp: Number(point.timestamp) / 1000000,
          note: point.note.length > 0 ? point.note[0] : undefined,
        })),
      }));

      setTrackathon(formattedTrackathon);
      // Sort by last point timestamp (most recent first)
      setParticipants(formattedParticipants.sort((a, b) => {
        const lastPointA = a.trackPoints[a.trackPoints.length - 1];
        const lastPointB = b.trackPoints[b.trackPoints.length - 1];
        return lastPointB.timestamp - lastPointA.timestamp;
      }));
      setLoading(false);
    } catch (error) {
      console.error('Failed to load trackathon:', error);
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      const result = await alltracks.registerForTrackathon(trackathonId!);
      
      if ('ok' in result) {
        showNotification('Successfully registered! You can start tracking once the trackathon begins.', 'success');
        loadTrackathonData();
      } else {
        showNotification('Failed to register: ' + result.err, 'error');
      }
    } catch (error) {
      console.error('Failed to register:', error);
      showNotification('Failed to register for trackathon', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRecordPoint = async () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setShowRecordModal(true);
        },
        (error) => {
          showNotification('Unable to get your location. Please enable location permissions.', 'error');
          console.error('Geolocation error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      showNotification('Geolocation is not supported by your browser.', 'error');
    }
  };

  const handleSavePoint = async () => {
    if (!currentLocation) return;
    
    setIsSavingPoint(true);
    try {
      // Create point in backend API format (using 'as any' to match backend interface)
      const apiPoint = {
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        elevation: [], // Will be calculated by backend or can be added from device
        timestamp: BigInt(Date.now() * 1000000), // Convert to nanoseconds
        note: recordNote ? [recordNote] : [],
      } as any;
      
      const result = await alltracks.recordTrackathonPoint(trackathonId!, apiPoint);
      
      if ('ok' in result) {
        showNotification('Point recorded successfully!', 'success');
        setShowRecordModal(false);
        setRecordNote('');
        setCurrentLocation(null);
        loadTrackathonData(); // Refresh data
      } else {
        showNotification('Failed to record point: ' + result.err, 'error');
      }
    } catch (error) {
      console.error('Failed to record point:', error);
      showNotification('Failed to record point', 'error');
    } finally {
      setIsSavingPoint(false);
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

  const formatPrincipalId = (principalId: string) => {
    if (principalId.length <= 10) return principalId;
    return `${principalId.slice(0, 5)}...${principalId.slice(-5)}`;
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
              <button className="register-button" onClick={handleRegister} disabled={isRegistering}>
                {isRegistering ? (
                  <>
                    <span className="spinner"></span>
                    Registering...
                  </>
                ) : (
                  <>
                    <span className="material-icons">how_to_reg</span>
                    Register Now
                  </>
                )}
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
              {trackathon.registrations.map((userId) => (
                <div key={userId} className="user-item">
                  <span className="material-icons">person</span>
                  <span>{formatPrincipalId(userId)}</span>
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
              <button className="start-button" onClick={handleRecordPoint}>
                <span className="material-icons">add_location</span>
                Record Point
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
                    const isSelected = selectedParticipant?.principal === participant.principal;
                    return (
                      <div 
                        key={participant.principal} 
                        className={`participant-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedParticipant(
                          isSelected ? null : participant
                        )}
                        style={{ cursor: 'pointer' }}
                      >
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
                        {lastPoint?.note && (
                          <div className="participant-note">
                            <span className="material-icons">chat_bubble</span>
                            <div className="note-content">
                              <span className="note-text">"{lastPoint.note}"</span>
                            
                            </div>
                          </div>
                        )}
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
                <h3>{selectedParticipant ? `${selectedParticipant.username}'s Route` : 'Live Map - All Routes'}</h3>
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
                    {selectedParticipant ? (
                      <React.Fragment>
                        <Polyline
                          positions={selectedParticipant.trackPoints.map(p => [p.lat, p.lng])}
                          color="#007bff"
                          weight={4}
                        />
                        {selectedParticipant.trackPoints.length > 0 && (
                          <Marker 
                            position={[
                              selectedParticipant.trackPoints[selectedParticipant.trackPoints.length - 1].lat,
                              selectedParticipant.trackPoints[selectedParticipant.trackPoints.length - 1].lng
                            ]}
                          >
                            <Popup>
                              <strong>{selectedParticipant.username}</strong><br />
                              Current Position<br />
                              Lat: {selectedParticipant.trackPoints[selectedParticipant.trackPoints.length - 1].lat.toFixed(6)}, 
                              Lng: {selectedParticipant.trackPoints[selectedParticipant.trackPoints.length - 1].lng.toFixed(6)}<br />
                              Elevation: {selectedParticipant.trackPoints[selectedParticipant.trackPoints.length - 1].elevation}m<br />
                              {formatTime(selectedParticipant.trackPoints[selectedParticipant.trackPoints.length - 1].timestamp)}<br />
                              {selectedParticipant.trackPoints[selectedParticipant.trackPoints.length - 1].note && 
                                <em>{selectedParticipant.trackPoints[selectedParticipant.trackPoints.length - 1].note}</em>}
                            </Popup>
                          </Marker>
                        )}
                      </React.Fragment>
                    ) : (
                      participants.map((participant, pIdx) => (
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
                      ))
                    )}
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

      {/* Record Point Modal */}
      {showRecordModal && currentLocation && (
        <div className="modal-overlay" onClick={() => setShowRecordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>

            <div className="modal-body">
              <div className="form-group">
                <textarea
                  id="note-input"
                  value={recordNote}
                  onChange={(e) => setRecordNote(e.target.value)}
                  placeholder="Share your thoughts, feelings, or what you see..."
                  rows={4}
                  maxLength={500}
                />
                <div className="location-coords-inline">
                  Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}
                </div>
                
              </div>
            </div>
            <div className="modal-footer">
              <button className="save-button" onClick={handleSavePoint} disabled={isSavingPoint}>
                {isSavingPoint ? (
                  <>
                    <span className="spinner"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="material-icons">save</span>
                    Save
                  </>
                )}
              </button>
              <button className="cancel-button" onClick={() => setShowRecordModal(false)} disabled={isSavingPoint}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
