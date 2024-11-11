import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { User } from "@junobuild/core"
import './Profile.css';
import { Navbar } from '../components/Navbar';
import { Doc, setDoc, getDoc } from "@junobuild/core";
import { Tracks } from '../components/Tracks';
import { Trails } from '../components/Trails';
import { GroupManagement } from '../components/GroupManagement';

interface ProfileSettings {
  storageId: string;
  trackPointCollection: string;
  trackFileCollection: string;

}
interface Track {
  id: string;
  name: string;
  distance: number;
  date: string;
}


export const Profile: React.FC<{ user: User | null }> = ({ user }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [mydoc, setMydoc] = useState<Doc<ProfileSettings> | null>(null);
  const [settings, setSettings] = useState<ProfileSettings>({
    storageId: '',
    trackPointCollection: '',
    trackFileCollection: ''
  });
  const [activeTab, setActiveTab] = useState('profile');
  // Add this with other useState declarations
  const [tracks, setTracks] = useState<Track[]>([]);

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

  useEffect(() => {
    const loadSettings = async () => {
      if (user?.key) {
        const doc = await getDoc<ProfileSettings>({
          collection: "profiles",
          key: user.key
        });
        setMydoc(doc || null);
        if (doc?.data) {
          setSettings(doc.data);
        }
      }
    };

    loadSettings();
  }, [user]);
  if (!user) {
    return <Navigate to="/" replace />;
  }
  const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value.trim()
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings.storageId.trim()) {
      setSaveStatus('error');
      return;
    }
    setIsSubmitting(true);
    setSaveStatus('idle');

    try {
      if (mydoc?.key) {
        await setDoc({
          collection: "profiles",
          doc: {
            ...mydoc,
            data: settings,
          }
        });
      } else {
        await setDoc({
          collection: "profiles",
          doc: {
            key: user?.key || '',
            data: settings,
          }
        });
      }

      setSaveStatus('success');
    } catch (error) {
      setSaveStatus('error');
    } finally {
      setIsSubmitting(false);
      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

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
            <div
              className={`sidebar-item ${activeTab === 'storage' ? 'active' : ''}`}
              onClick={() => setActiveTab('storage')}
            >
              <span className="material-icons">cloud</span>
              Storage
            </div>
            <div
              className={`sidebar-item ${activeTab === 'group' ? 'active' : ''}`}
              onClick={() => setActiveTab('group')}
            >
              <span className="material-icons">group</span>
              Groups
            </div>
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

          </div>
          <div className="profile-content">
            {activeTab === 'profile' && (
              <>
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
              </>
            )}

            {activeTab === 'storage' && (
              <div className="profile-settings">
                <h3>Settings</h3>
                <div className="settings-header">
                  <span>Private Storage Configuration</span>
                  <a
                    href="https://juno.build/docs/create-a-satellite"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="help-link"
                  >
                    <span className="material-icons">help_outline</span>
                    Setup Guide
                  </a>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="settings-item">
                    <div className="setting-content">
                      <label>Storage ID</label>
                      <input
                        type="text"
                        name="storageId"
                        value={settings.storageId}
                        onChange={handleSettingChange}
                        placeholder="Sattelite Id"
                        required
                      />
                    </div>
                  </div>
                  <div className="settings-item">
                    <div className="setting-content">
                      <label>Track Point </label>
                      <input
                        type="text"
                        name="trackPointCollection"
                        value={settings.trackPointCollection}
                        onChange={handleSettingChange}
                        placeholder="Enter datastore collection ID for track points"
                      />
                    </div>
                  </div>
                  <div className="settings-item">
                    <div className="setting-content">
                      <label>Track File </label>
                      <input
                        type="text"
                        name="trackFileCollection"
                        value={settings.trackFileCollection}
                        onChange={handleSettingChange}
                        placeholder="Enter storage collection ID  for track file "
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="save-settings"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="material-icons spinning">refresh</span>
                    ) : 'Save Settings'}
                  </button>
                  {saveStatus === 'success' && (
                    <div className="save-notification success">
                      Settings saved successfully!
                    </div>
                  )}
                  {saveStatus === 'error' && (
                    <div className="save-notification error">
                      Failed to save settings. Please try again.
                    </div>
                  )}
                </form>
              </div>
            )}
            {activeTab === 'group' && (
              <GroupManagement user={user} />
            )}
            {activeTab === 'tracks' && <Tracks user={user} />}
            {activeTab === 'trails' && <Trails user={user} />}
          </div>
        </div>
      </div>
    </>
  );
};
