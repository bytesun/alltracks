import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { User } from "@junobuild/core"
import './Profile.css';
import { Navbar } from '../components/Navbar';
import { Doc, setDoc, getDoc } from "@junobuild/core";
import { Tracks } from '../components/Tracks';
import { Trails } from '../components/Trails';
import { GroupManagement } from '../components/GroupManagement';
import { Inbox } from '../components/Inbox';
import { Settings } from '../components/Settings';
import { useNotification } from '../context/NotificationContext';
import { TrackAchievements } from '../components/TrackAchievements';

interface Track {
  id: string;
  name: string;
  distance: number;
  date: string;
}

import { UserStats } from '../types/UserStats';

export const Profile: React.FC<{ user: User | null }> = ({ user }) => {

  const [activeTab, setActiveTab] = useState('profile');
  // Add this with other useState declarations
  const [tracks, setTracks] = useState<Track[]>([]);
  const { showNotification } = useNotification();
  const [userStats, setUserStats] = useState<UserStats>({
    totalDistance: 0,
    totalHours: 0,
    totalElevation: 0,
    completedTrails: 0,
    firstHikeDate: new Date().toDateString(),
  });

  useEffect(() => {
    const loadUserStats = async () => {
      const statDoc = await getDoc<UserStats>({
        collection: "stats",
        key: user?.key,
      });
      setUserStats(statDoc?.data || {
        totalDistance: 0,
        totalHours: 0,
        totalElevation: 0,
        completedTrails: 0,
        firstHikeDate: new Date().toDateString(),
      });
    };

    if (user) {
      loadUserStats();
    }
  }, [user]);

  // Add this with other useEffect hooks to load tracks
  useEffect(() => {
    const loadTracks = async () => {
      if (user?.key) {
        // Load tracks from your storage here
        // For now using empty array
        setTracks([]);
      }
    };

    loadTracks();
  }, [user]);

  useEffect(() => {
    if (user) {
      console.log('user', user);
    }
  }, [user]);


  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Navbar />
      <div className="profile-container">
        <div className="profile-layout">
          <div className="profile-sidebar">
            <div
              className={`sidebar-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <span className="material-icons">person</span>
              Profile
            </div>
            {/* <div
              className={`sidebar-item ${activeTab === 'inbox' ? 'active' : ''}`}
              onClick={() => setActiveTab('inbox')}
            >
              <span className="material-icons">inbox</span>
              Inbox
            </div>

            <div
              className={`sidebar-item ${activeTab === 'group' ? 'active' : ''}`}
              onClick={() => setActiveTab('group')}
            >
              <span className="material-icons">group</span>
              Groups
            </div> */}
            <div
              className={`sidebar-item ${activeTab === 'tracks' ? 'active' : ''}`}
              onClick={() => setActiveTab('tracks')}
            >
              <span className="material-icons">route</span>
              Tracks
            </div>
            <div
              className={`sidebar-item ${activeTab === 'trails' ? 'active' : ''}`}
              onClick={() => setActiveTab('trails')}
            >
              <span className="material-icons">terrain</span>
              Trails
            </div>
            <div
              className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <span className="material-icons">settings</span>
              Settings
            </div>
          </div>
          <div className="profile-content">
            {activeTab === 'profile' && (
              <>
                <h2>Profile </h2>
                <div className="profile-info">
                  <div className="info-item">
                    <span className="material-icons">badge</span>
                    <p>{user?.key}</p>
                  </div>
                  <TrackAchievements stats={userStats} />
                </div>
              </>
            )}


            {activeTab === 'group' && (
              <GroupManagement user={user} />
            )}
            {activeTab === 'tracks' && <Tracks user={user} />}
            {activeTab === 'trails' && <Trails user={user} />}
            {activeTab === 'inbox' && <Inbox user={user} />}
            {activeTab === 'settings' && (
              <Settings
                user={user}
                showNotification={showNotification}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};
