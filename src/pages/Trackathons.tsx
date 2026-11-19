import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlltracks, useGlobalContext } from '../components/Store';
import { useNotification } from '../context/NotificationContext';
import { Trackathon, ActivityType } from '../types/Trackathon';
import { CreateTrackathonModal } from '../components/CreateTrackathonModal';
import '../styles/Trackathons.css';

const UNKNOWN_ERROR_MESSAGE = 'Unknown error';
const API_PAGE_SIZE = 100;
const LIST_PAGE_SIZE = 20;

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return UNKNOWN_ERROR_MESSAGE;
  }
};

export const Trackathons: React.FC = () => {
  const navigate = useNavigate();
  const alltracks = useAlltracks();
  const { state: { isAuthed, principal } } = useGlobalContext();
  const { showNotification } = useNotification();
  
  const [trackathons, setTrackathons] = useState<Trackathon[]>([]);
  const [page, setPage] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'upcoming' | 'past'>('active');
  const [userScore, setUserScore] = useState<number>(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  useEffect(() => {
    loadTrackathons();
    if (isAuthed && principal) {
      loadUserScore();
    }
  }, [isAuthed, principal]);

  const loadUserScore = async () => {
    if (!principal) {
      setUserScore(0);
      return;
    }
    
    try {
      // Get user stats from backend
      const userStats = await alltracks.getUserstats(principal.toText());
      
      if (!userStats || userStats.length === 0) {
        setUserScore(0);
        return;
      }
      
      const stats = userStats[0];
      
      // Calculate score using the same formula as TrackAchievements
      const distancePoints = stats.totalDistance * 0.01;
      const elevationPoints = stats.totalElevation * 0.03;
      const trailPoints = Number(stats.completedTrails) * 0.02;
      const hoursPoints = stats.totalHours * 0.01;
      
      // Calculate experience bonus based on first hike date
      const firstHikeDate = new Date(Number(stats.firstHikeDate) / 1000000);
      const daysSinceFirstHike = Math.floor(
        (new Date().getTime() - firstHikeDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const experienceBonus = daysSinceFirstHike * 0.005;
      
      const calculatedScore = Math.floor(
        distancePoints + elevationPoints + trailPoints + hoursPoints + experienceBonus
      );
      
      setUserScore(calculatedScore);
    } catch (error) {
      console.error('Failed to load user score:', error);
    }
  };

  const loadTrackathons = async () => {
    setIsLoading(true);
    try {
      // Load all backend pages so status filtering never silently excludes older records.
      const result: Awaited<ReturnType<typeof alltracks.getAllTrackathons>> = [];
      for (let offset = 0; ; offset += API_PAGE_SIZE) {
        const batch = await alltracks.getAllTrackathons(BigInt(offset / API_PAGE_SIZE), BigInt(API_PAGE_SIZE));
        result.push(...batch);
        if (batch.length < API_PAGE_SIZE) break;
      }
      
      // Convert backend Trackathon format to frontend format
      const formattedTrackathons: Trackathon[] = result.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        startTime: Number(t.startTime) / 1000000, // Convert nanoseconds to milliseconds
        endTime: Number(t.endTime) / 1000000,
        duration: t.duration,
        activityType: Object.keys(t.activityType)[0] as ActivityType,
        registrations: t.registrations.map(p => p.toText()),
        createdBy: t.createdBy.toText(),
        createdAt: Number(t.createdAt) / 1000000,
        groupId: t.groupId.length > 0 ? t.groupId[0] : undefined,
      }));
      
      setTrackathons(formattedTrackathons);
      setPage(0);
    } catch (error) {
      showNotification('Failed to load trackathons', 'error');
      console.error('Error loading trackathons:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTrackathon = async (data: {
    name: string;
    description: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    activityType: ActivityType;
    groupId?: string;
  }) => {
    try {
      // Convert activityType string to backend format
      const activityTypeObj = { [data.activityType]: null };
      
      const result = await alltracks.createTrackathon({
        name: data.name,
        description: data.description,
        startTime: BigInt(data.startTime.getTime() * 1000000), // Convert to nanoseconds
        endTime: BigInt(data.endTime.getTime() * 1000000),
        duration: data.duration,
        activityType: activityTypeObj,
        groupId: data.groupId ? [data.groupId] : [],
      });

      if ('ok' in result) {
        // Reload trackathons to get the newly created one
        await loadTrackathons();
        setShowCreateModal(false);
        showNotification('Trackathon created successfully', 'success');
      } else {
        showNotification('Failed to create trackathon: ' + result.err, 'error');
      }
    } catch (error) {
      showNotification(`Failed to create trackathon: ${getErrorMessage(error)}`, 'error');
      console.error('Error creating trackathon:', error);
    }
  };

  const getFilteredTrackathons = () => {
    const now = Date.now();
    return trackathons.filter(t => {
      switch (filter) {
        case 'active':
          return t.startTime <= now && t.endTime >= now;
        case 'upcoming':
          return t.startTime > now;
        case 'past':
          return t.endTime < now;
        default:
          return true;
      }
    });
  };

  const filteredTrackathons = getFilteredTrackathons();
  const totalPages = Math.max(1, Math.ceil(filteredTrackathons.length / LIST_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const visibleTrackathons = filteredTrackathons.slice(currentPage * LIST_PAGE_SIZE, (currentPage + 1) * LIST_PAGE_SIZE);

  const changeFilter = (next: typeof filter) => {
    setFilter(next);
    setPage(0);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (trackathon: Trackathon) => {
    const now = Date.now();
    if (trackathon.startTime <= now && trackathon.endTime >= now) {
      return <span className="status-badge active">Live</span>;
    } else if (trackathon.startTime > now) {
      return <span className="status-badge upcoming">Upcoming</span>;
    } else {
      return <span className="status-badge past">Ended</span>;
    }
  };

  const handleCreateClick = () => {
    if (!isAuthed) {
      showNotification('Please login to create a trackathon', 'info');
      return;
    }
    if (userScore === 0) {
      showNotification('You need to complete at least one track before creating a trackathon. Start tracking to unlock this feature!', 'info');
      return;
    }
    setShowCreateModal(true);
  };

  return (
    <div className="trackathons-container">
      <div className="trackathons-header">
        <div className="header-content">
          <h1>Trackathons</h1>
          <div className="description-section">
            <p className="description-text">
              {isDescriptionExpanded ? (
                <>
                  Trackathon is an open, flexible movement challenge where anyone can join by simply tracking their route. Whether you're hiking, running, sailing, cycling, or even delivering packages, every journey counts.
                  <br /><br />
                  Instead of gathering at the same place or struggling with time zones, participants only need to complete any specific time (e.g 8hours) activity window of their choice. During that period, your route becomes your adventure — and your achievement.
                  <br /><br />
                  At the end, Trackathon highlights individual and collective performance across multiple dimensions such as distance, speed, elevation, and creativity of route.
                  <br /><br />
                  Trackathon celebrates persistence, exploration, and the spirit of moving forward — step by step, track by track.
                </>
              ) : (
                <>
                  Trackathon is an open, flexible movement challenge where anyone can join by simply tracking their route. Whether you're hiking, running, sailing, cycling, or even delivering packages, every journey counts.
                </>
              )}
              <span 
                className="toggle-description"
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              >
                {isDescriptionExpanded ? ' less' : ' more...'}
              </span>
            </p>
          </div>
        </div>
        {isAuthed && (
          <button 
            className="create-trackathon-btn"
            onClick={handleCreateClick}
          >
            <span className="material-icons">add</span>
            Create Trackathon
          </button>
        )}
      </div>

      <div className="filter-tabs">
        <button 
          className={filter === 'all' ? 'active' : ''}
          onClick={() => changeFilter('all')}
        >
          All
        </button>
        <button 
          className={filter === 'active' ? 'active' : ''}
          onClick={() => changeFilter('active')}
        >
          <span className="material-icons">sensors</span>
          Live
        </button>
        <button 
          className={filter === 'upcoming' ? 'active' : ''}
          onClick={() => changeFilter('upcoming')}
        >
          <span className="material-icons">schedule</span>
          Upcoming
        </button>
        <button 
          className={filter === 'past' ? 'active' : ''}
          onClick={() => changeFilter('past')}
        >
          <span className="material-icons">history</span>
          Past
        </button>
      </div>

      {isLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading trackathons...</p>
        </div>
      ) : filteredTrackathons.length === 0 ? (
        <div className="empty-state">
          <span className="material-icons">flag</span>
          <h3>No trackathons found</h3>
          <p>Be the first to create a trackathon challenge!</p>
          {isAuthed && userScore > 1000 && (
            <button 
              className="create-trackathon-btn"
              onClick={handleCreateClick}
            >
              Create Trackathon
            </button>
          )}
        </div>
      ) : (
        <div className="trackathons-grid">
          {visibleTrackathons.map(trackathon => (
            <div 
              key={trackathon.id} 
              className="trackathon-card"
              onClick={() => navigate(`/trackathon/${trackathon.id}`)}
            >
              <div className="card-header">
                <h3>{trackathon.name}</h3>
                {getStatusBadge(trackathon)}
              </div>
              
              <p className="description">{trackathon.description}</p>
              
              <div className="card-meta">
                <div className="meta-item">
                  <span className="material-icons">event</span>
                  <span>Join: {formatDate(trackathon.startTime)}</span>
                </div>
                <div className="meta-item">
                  <span className="material-icons">schedule</span>
                  <span>{trackathon.duration}h duration</span>
                </div>
                <div className="meta-item">
                  <span className="material-icons">
                    {trackathon.activityType === 'hiking' ? 'hiking' : 
                     trackathon.activityType === 'running' ? 'directions_run' :
                     trackathon.activityType === 'cycling' ? 'directions_bike' :
                     trackathon.activityType === 'rowing' ? 'rowing' : 'fitness_center'}
                  </span>
                  <span>{trackathon.activityType.charAt(0).toUpperCase() + trackathon.activityType.slice(1)}</span>
                </div>
                <div className="meta-item">
                  <span className="material-icons">group</span>
                  <span>{trackathon.registrations.length} registered</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredTrackathons.length > 0 && (
        <nav className="pagination" aria-label="Trackathon pages">
          <button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button>
          <span>Page {currentPage + 1} of {totalPages} · {filteredTrackathons.length} challenges</span>
          <button disabled={currentPage >= totalPages - 1} onClick={() => setPage(currentPage + 1)}>Next</button>
        </nav>
      )}

      {showCreateModal && (
        <CreateTrackathonModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTrackathon}
        />
      )}
    </div>
  );
};
