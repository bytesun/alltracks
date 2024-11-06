import React from 'react';
import { User } from "@junobuild/core"
import './Profile.css';
import { Navbar } from '../components/Navbar';

export const Profile: React.FC<{ user: User | null }> = ({ user }) => {
  return (
    <>
      <Navbar />
      <div className="profile-container">

        <h2>Profile</h2>
        <div className="profile-info">
          <div className="info-item">
            <span className="material-icons">badge</span>
            <p>{user?.key}</p>
          </div>
          <div className="info-item">
            <span className="material-icons">access_time</span>
            <p>Member since: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <div className="profile-settings">
          <h3>Settings</h3>
          {/* Add settings options here */}
        </div>
      </div>
    </>
  );
};
