import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

import '../styles/Profile.css';

import { Tracks } from '../components/Tracks';
import { Trails } from '../components/Trails';
import { GroupManagement } from '../components/GroupManagement';

import { Settings } from '../components/Settings';
import { useNotification } from '../context/NotificationContext';
import { TrackAchievements } from '../components/TrackAchievements';
import { ArStorage } from '../components/ArStorage';
import { SavedPoints } from '../components/SavedPoints';

import { UserStats } from '../types/UserStats';
import { useGlobalContext, useAlltracks } from '../components/Store';

export const Profile: React.FC = () => {

  const alltracks = useAlltracks();
  const [activeTab, setActiveTab] = useState('profile');
  const { state: { isAuthed, principal } } = useGlobalContext();

  const { showNotification } = useNotification();
  const [userStats, setUserStats] = useState<UserStats>({
    totalDistance: 0,
    totalHours: 0,
    totalElevation: 0,
    completedTrails: 0,
    firstHikeDate: new Date().toDateString(),
  });

  useEffect(() => {
    console.log("Loading user stats...")
    const loadUserStats = async () => {
      console.log("Loading user stats in...")
      const us = await alltracks.getUserstats(principal.toText());
      console.log(us)

      if (us.length > 0) {
        const uss = us[0];
        setUserStats({
          totalDistance: uss.totalDistance,
          totalHours: uss.totalHours,
          totalElevation: uss.totalElevation,
          completedTrails: Number(uss.completedTrails),
          firstHikeDate: new Date(Number(uss.firstHikeDate) / 1000000).toLocaleDateString(),
        });
      };

    }
    loadUserStats();
  }, [isAuthed]);


  if (!isAuthed) {
    return <Navigate to="/" replace />;
  }

  return (
    <>

      <div className="profile-container">
        <div className="profile-layout">
          <div className="profile-sidebar">
            <div
              className={`sidebar-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <span className="material-icons">person</span>
              POH
            </div>


            <div
              className={`sidebar-item ${activeTab === 'group' ? 'active' : ''}`}
              onClick={() => setActiveTab('group')}
            >
              <span className="material-icons">group</span>
              Groups
            </div>
            {/* <div
              className={`sidebar-item ${activeTab === 'tracks' ? 'active' : ''}`}
              onClick={() => setActiveTab('tracks')}
            >
              <span className="material-icons">route</span>
              Tracks
            </div> */}
            <div
              className={`sidebar-item ${activeTab === 'trails' ? 'active' : ''}`}
              onClick={() => setActiveTab('trails')}
            >
              <span className="material-icons">terrain</span>
              Trails
            </div>

            <div
              className={`sidebar-item ${activeTab === 'arstorage' ? 'active' : ''}`}
              onClick={() => setActiveTab('arstorage')}
            >
              <span className="material-icons">cloud_upload</span>
              Photos
            </div>
            <div
              className={`sidebar-item ${activeTab === 'savedpoints' ? 'active' : ''}`}
              onClick={() => setActiveTab('savedpoints')}
            >
              <span className="material-icons">bookmark</span>
              Saved
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
                <h2>Proof Of Hiking </h2>
                <div className="profile-info">
                  {/* <div className="info-item">
                    <span className="material-icons">badge</span>
                    <p>{user?.key}</p>
                  </div> */}
                  <TrackAchievements stats={userStats} userId={principal.toText()} />
                </div>
              </>
            )}


            {activeTab === 'group' && (
              <GroupManagement />
            )}
            {/* {activeTab === 'tracks' && <Tracks />} */}
            {activeTab === 'trails' && <Trails />}

            {activeTab === 'arstorage' && (
              <ArStorage
              />
            )}
            {activeTab === 'savedpoints' && (
              <>
                <h2>Saved Points</h2>
                <div className="saved-points-container">
                  <SavedPoints />
                </div>
              </>
            )}

            {activeTab === 'settings' && (
                <Settings />              
            )}
          </div>
        </div>
      </div>
    </>
  );
};
