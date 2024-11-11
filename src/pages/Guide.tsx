import React from 'react';
import { Navbar } from '../components/Navbar';
import './Guide.css';

export const Guide = () => {
  return (
    <div>
      <Navbar />
      <div className="guide-container">
        <h1>AllTracks User Guide</h1>
        
        <section className="guide-section">
          <h2>Getting Started</h2>
          <div className="guide-content">
            <div className="guide-item">
              <span className="material-icons">login</span>
              <div>
                <h3>Sign In with Internet Identity</h3>
                <ul>
                  <li>Click "Sign In" in the top menu</li>
                  <li>Create or use existing Internet Identity</li>
                  <li>Access your personalized dashboard</li>
                  <li>Set up your profile information</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="guide-section">
          <h2>Trail Features</h2>
          <div className="guide-content">
            <div className="guide-item">
              <span className="material-icons">add_location</span>
              <div>
                <h3>Creating Trails</h3>
                <ul>
                  <li>Navigate to Trails section</li>
                  <li>Click "Create New Trail"</li>
                  <li>Fill required information:
                    <ul>
                      <li>Trail name and description</li>
                      <li>Length and elevation gain</li>
                      <li>Difficulty level</li>
                      <li>Route type (loop, out-and-back, etc.)</li>
                      <li>Upload GPX/KML file</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="guide-item">
              <span className="material-icons">map</span>
              <div>
                <h3>Trail Navigation</h3>
                <ul>
                  <li>View trail on interactive map</li>
                  <li>Filter trails by difficulty</li>
                  <li>Check elevation profile</li>
                  <li>View trail statistics</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="guide-section">
          <h2>Group Management</h2>
          <div className="guide-content">
            <div className="guide-item">
              <span className="material-icons">group_add</span>
              <div>
                <h3>Creating Groups</h3>
                <ul>
                  <li>Go to Profile - Groups</li>
                  <li>Click "Create New Group"</li>
                  <li>Set group details:
                    <ul>
                      <li>Group name and description</li>
                      <li>Upload group badge</li>
                      <li>Connect ICEvent calendar</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="guide-item">
              <span className="material-icons">event</span>
              <div>
                <h3>Event Integration</h3>
                <ul>
                  <li>Access ICEvent platform</li>
                  <li>View group calendar</li>
                  <li>Join upcoming activities</li>
                  <li>Track event participation</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="guide-section">
          <h2>Safety Features</h2>
          <div className="guide-content">
            <div className="guide-item">
              <span className="material-icons">share_location</span>
              <div>
                <h3>Location Sharing</h3>
                <ul>
                  <li>Enable live tracking</li>
                  <li>Share location with group</li>
                  <li>Set tracking duration</li>
                  <li>Monitor group members</li>
                </ul>
              </div>
            </div>
            
            <div className="guide-item">
              <span className="material-icons">warning</span>
              <div>
                <h3>Safety Reports</h3>
                <ul>
                  <li>Report trail hazards</li>
                  <li>Mark points of interest</li>
                  <li>View community alerts</li>
                  <li>Access emergency contacts</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="guide-section">
          <h2>Profile Management</h2>
          <div className="guide-content">
            <div className="guide-item">
              <span className="material-icons">person</span>
              <div>
                <h3>User Profile</h3>
                <ul>
                  <li>Update personal information</li>
                  <li>View activity history</li>
                  <li>Manage group memberships</li>
                  <li>Set notification preferences</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};