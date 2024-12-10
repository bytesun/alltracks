import React, { useState, useEffect } from 'react';
import { User } from "@junobuild/core";
import { Doc, setDoc, getDoc } from "@junobuild/core";
import '../styles/Settings.css';
import { Spinner } from './Spinner';
import { ProfileSettings } from '../types/profileSettings';
import { useStats } from '../context/StatsContext';
import { SecuritySettings } from './SecuritySettings';

export const Settings = () => {
    const [mydoc, setMydoc] = useState<Doc<ProfileSettings> | null>(null);
    const [settings, setSettings] = useState<ProfileSettings>({
        storageId: '',
        trackPointCollection: '',
        trackFileCollection: '',
        inboxCollection: '',
        inboxAttachmentCollection: ''
    });
    // useEffect(() => {
    //     const loadSettings = async () => {
    //         if (user?.key) {
    //             const doc = await getDoc<ProfileSettings>({
    //                 collection: "profiles",
    //                 key: user.key
    //             });
    //             setMydoc(doc || null);
    //             if (doc?.data) {
    //                 setSettings(doc.data);
    //             }
    //         }
    //     };

    //     loadSettings();
    // }, [user]);
    const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: value.trim()
        }));
    };

    // const handleSubmit = async (e: React.FormEvent) => {
    //     e.preventDefault();
    //     if (!settings.storageId.trim()) {
    //         setSaveStatus('error');
    //         return;
    //     }
    //     setIsSubmitting(true);
    //     setSaveStatus('idle');

    //     try {
    //         if (mydoc?.key) {
    //             await setDoc({
    //                 collection: "profiles",
    //                 doc: {
    //                     ...mydoc,
    //                     data: settings,
    //                 }
    //             });
    //         } else {
    //             await setDoc({
    //                 collection: "profiles",
    //                 doc: {
    //                     key: user?.key || '',
    //                     data: settings,
    //                 }
    //             });
    //         }
    //         updateSettings(settings);
    //         showNotification('Settings saved successfully', 'success');
    //     } catch (error) {
    //         showNotification('Failed to save settings', 'error');
    //     } finally {
    //         setIsSubmitting(false);
    //     }
    // };
    return (
        <div className="settings-container">
            {/* <h3>Private Storage Settings</h3>
            <div className="settings-header">
                <a href="https://juno.build" target="_blank" rel="noopener noreferrer" className="guide-link">
                    <span className="material-icons">help_outline</span>
                    View Juno Setup Guide
                </a>
            </div> */}

            {/* <form onSubmit={handleSubmit}>
                <div className="settings-section">
      
                    <div className="setting-content">
                        <label>Storage ID</label>
                        <input
                            type="text"
                            name="storageId"
                            value={settings.storageId}
                            onChange={handleSettingChange}
                            placeholder="Satellite Id"
                        />
                    </div>

                </div>
                <div className="settings-section">
                    <h4>Tracks Configuration</h4>

                    <div className="setting-content">
                        <label>Track Point Collection</label>
                        <input
                            type="text"
                            name="trackPointCollection"
                            value={settings.trackPointCollection}
                            onChange={handleSettingChange}
                            placeholder="Enter datastore collection ID"
                        />
                    </div>
                    <div className="setting-content">
                        <label>Track File Collection</label>
                        <input
                            type="text"
                            name="trackFileCollection"
                            value={settings.trackFileCollection}
                            onChange={handleSettingChange}
                            placeholder="Enter storage collection ID"
                        />
                    </div>
                </div>

                <div className="settings-section">
                    <h4>Inbox Settings</h4>
                    <div className="setting-content">
                        <label>Inbox Collection</label>
                        <input
                            type="text"
                            name="inboxCollection"
                            value={settings.inboxCollection}
                            onChange={handleSettingChange}
                            placeholder="Enter inbox collection ID"
                        />
                    </div>
                    <div className="setting-content">
                        <label>Inbox Attachments</label>
                        <input
                            type="text"
                            name="inboxAttachmentCollection"
                            value={settings.inboxAttachmentCollection}
                            onChange={handleSettingChange}
                            placeholder="Enter attachment collection ID"
                        />
                    </div>
                </div>

                <button type="submit" className="save-settings" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <Spinner size="small" color="white" />
                    ) : (
                        'Save Settings'
                    )}
                </button>
            </form> */}

            <div className="settings-section">
                <SecuritySettings />
            </div>
        </div>
    );
};
