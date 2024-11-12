import React from 'react';
import '../styles/TrackAchievements.css';
import { UserStats } from  "../types/UserStats";

export const TrackAchievements: React.FC<{ stats: UserStats }> = ({ stats }) => {
  const { totalDistance, totalHours, totalElevation, completedTrails, firstHikeDate } = stats;
  
  return (
    <div className="achievements-grid">
      <div className="achievement-card">
        <span className="material-icons">straighten</span>
        <div className="achievement-content">
          <h4>Total Distance</h4>
          <p>{totalDistance.toFixed(2) } km</p>
        </div>
      </div>
      
      <div className="achievement-card">
        <span className="material-icons">schedule</span>
        <div className="achievement-content">
          <h4>Total Hours</h4>
          <p>{totalHours.toFixed(2)} hrs</p>
        </div>
      </div>

      <div className="achievement-card">
        <span className="material-icons">terrain</span>
        <div className="achievement-content">
          <h4>Total Elevation</h4>
          <p>{totalElevation.toFixed(2)} m</p>
        </div>
      </div>

      <div className="achievement-card">
        <span className="material-icons">hiking</span>
        <div className="achievement-content">
          <h4>Trails Completed</h4>
          <p>{completedTrails}</p>
        </div>
      </div>

      <div className="achievement-card">
        <span className="material-icons">calendar_today</span>
        <div className="achievement-content">
          <h4>Hiking Since</h4>
          <p>{firstHikeDate}</p>
        </div>
      </div>
    
    </div>
  );
};