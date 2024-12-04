import React from 'react';
import { Navbar } from '../components/Navbar';
import './Guide.css';

export const Guide = () => {
  return (
    <div>

      <div className="guide-container">
        <h1>AllTracks User Guide</h1>
        
        <section className="guide-section">
          <h2>Getting Started</h2>
          <div className="guide-content">
            <div className="guide-item">
              <span className="material-icons">login</span>
              <div>
                <h3>Internet Identity Authentication</h3>
                <ul>
                  <li>Sign in with Internet Identity</li>
                  <li>Access your personalized dashboard</li>
                  <li>View your hiking statistics</li>
                  <li>Track your achievements</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="guide-section">
          <h2>Track Recording</h2>
          <div className="guide-content">
            <div className="guide-item">
              <span className="material-icons">add_location</span>
              <div>
                <h3>Starting a Track</h3>
                <ul>
                  <li>Choose manual or automatic recording</li>
                  <li>Set auto-recording intervals</li>
                  <li>Optional group sharing</li>
                  <li>Continue previous tracks</li>
                </ul>
              </div>
            </div>
            
            <div className="guide-item">
              <span className="material-icons">photo_camera</span>
              <div>
                <h3>Track Points</h3>
                <ul>
                  <li>Capture location with photos</li>
                  <li>Add comments to points</li>
                  <li>Record elevation data</li>
                  <li>View full-size photos</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="guide-section">
          <h2>Timeline Views</h2>
          <div className="guide-content">
            <div className="guide-item">
              <span className="material-icons">timeline</span>
              <div>
                <h3>Personal Timeline</h3>
                <ul>
                  <li>View your track history</li>
                  <li>Filter by date range</li>
                  <li>Interactive map display</li>
                  <li>Detailed point information</li>
                </ul>
              </div>
            </div>
            
            <div className="guide-item">
              <span className="material-icons">groups</span>
              <div>
                <h3>Group & Event Timelines</h3>
                <ul>
                  <li>View shared group activities</li>
                  <li>Track event participants</li>
                  <li>Access group photos</li>
                  <li>Historical group data</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="guide-section">
          <h2>Profile Features</h2>
          <div className="guide-content">
            <div className="guide-item">
              <span className="material-icons">analytics</span>
              <div>
                <h3>Statistics & Achievements</h3>
                <ul>
                  <li>Total distance covered</li>
                  <li>Elevation gained</li>
                  <li>Hours spent hiking</li>
                  <li>Completed trails count</li>
                </ul>
              </div>
            </div>
            
            <div className="guide-item">
              <span className="material-icons">settings</span>
              <div>
                <h3>Settings & Data Management</h3>
                <ul>
                  <li>Manage track history</li>
                  <li>Clear local tracks</li>
                  <li>Configure preferences</li>
                  <li>Profile customization</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
        <section className="guide-section">
  <h2>Cloud Storage & Sharing</h2>
  <div className="guide-content">
    <div className="guide-item">
      <span className="material-icons">cloud_upload</span>
      <div>
        <h3>Arweave Integration</h3>
        <ul>
          <li>Connect your Arweave wallet</li>
          <li>Permanent storage of tracks</li>
          <li>Share tracks publicly or privately</li>
          <li>Access tracks across devices</li>
        </ul>
      </div>
    </div>
    
    <div className="guide-item">
      <span className="material-icons">import_export</span>
      <div>
        <h3>Track Export Options</h3>
        <ul>
          <li>Export to GPX, KML, CSV formats</li>
          <li>Choose cloud or local storage</li>
          <li>Add track descriptions</li>
          <li>Link tracks to events</li>
        </ul>
      </div>
    </div>
  </div>
</section>

      </div>
    </div>
  );
};