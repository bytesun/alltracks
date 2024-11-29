import React from 'react';
import '../styles/TrackAchievements.css';
import { UserStats } from "../types/UserStats";

export const TrackAchievements: React.FC<{ stats: UserStats }> = ({ stats }) => {
  const { totalDistance, totalHours, totalElevation, completedTrails, firstHikeDate } = stats;

  const calculateScore = () => {
    const distancePoints = totalDistance * 0.5;  // 10 points per km
    const elevationPoints = totalElevation * 1;  // 0.5 points per meter climbed
    const trailPoints = completedTrails * 0.2;  // 100 points per completed trail
    const hoursPoints = totalHours * 0.5;  // 20 points per hour hiked

    // Calculate experience bonus based on first hike date
    const daysSinceFirstHike = Math.floor((new Date().getTime() - new Date(firstHikeDate).getTime()) / (1000 * 60 * 60 * 24));
    const experienceBonus = daysSinceFirstHike * 0.1;  // 0.5 points per day since first hike

    return Math.floor(distancePoints + elevationPoints + trailPoints + hoursPoints + experienceBonus);
  };

  return (
    <div className="achievements-grid">

      {/* 
      <div className="achievement-card highlight">
        <span className="material-icons">stars</span>
        <div className="achievement-content">
          <h4>Hiker Score</h4>
          <p>{calculateScore()}</p>
        </div>
      </div> */}

      <div className="achievement-card">
        <span className="material-icons">calendar_today</span>
        <div className="achievement-content">
          <h4>Since</h4>
          <p>{firstHikeDate}</p>
        </div>
      </div>
      <div className="achievement-card">
        <span className="material-icons">speed</span>
        <div className="achievement-content">
          <h4>Average Pace</h4>
          <p>{(totalDistance / (totalHours || 1)).toFixed(2)} km/h</p>
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
        <span className="material-icons">straighten</span>
        <div className="achievement-content">
          <h4>Total Distance</h4>
          <p>{totalDistance.toFixed(2)} km</p>
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




    </div>
  );
};