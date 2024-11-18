import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Doc, getDoc, listDocs } from "@junobuild/core";
import { Navbar } from '../components/Navbar';
import { TrackPoint } from '../types/TrackPoint';
import { TimelineMapView } from '../components/TimelineMapView';
import { Track } from '../types/Track';
import '../styles/GroupPage.css';


interface Group {
    name: string;
    description: string;
    createdAt: string;
    memberCount: number;
    owner: string;
}

interface TrackData {
    id: string;
    title: string;
    distance: number;
    duration: number;
    createdAt: string;
    description: string;
}

export const GroupPage: React.FC = () => {
    const { groupId } = useParams();
    const [group, setGroup] = useState<Group | null>(null);
    const [tracks, setTracks] = useState<TrackData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'tracks' | 'timeline'>('tracks');
    const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);

    const [startDate, setStartDate] = useState<string>(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );

    const loadTrackPoints = async () => {
        setIsLoading(true);
        const start = BigInt(new Date(startDate).getTime() * 1000000);
        const end = BigInt(new Date(endDate).getTime() * 1000000);

        const result = await listDocs({
            collection: "live_tracks",

            filter: {
                matcher: {
                    key: ".*_" + groupId,
                    createdAt: {
                        matcher: "between",
                        timestamps: { start, end }
                    }
                },
                order: {
                    desc: true,
                    field: "updated_at"
                }
            }
        });

        const points = result.items.map(doc => doc.data as TrackPoint);
        setTrackPoints(points);
        setIsLoading(false);
    };

    useEffect(() => {
        loadTrackPoints();
    }, [groupId]);

    useEffect(() => {
        const loadGroupData = async () => {
            const groupDoc = await getDoc({
                collection: "groups",
                key: groupId || ''
            });
            setGroup(groupDoc.data as Group);

            const tracksResult = await listDocs({
                collection: "tracks",
                filter: {
                    matcher: {
                        key: ".*_" + groupId
                    }
                }
            });
            console.log(tracksResult.items);
            const tracks = tracksResult.items.map(item => {
                const track = item.data as Track;
                return {
                    id: item.key,
                    title: track.filename,
                    distance: track.distance,
                    duration: track.duration,
                    createdAt: track.startime,
                    description: track.description
                };
            } );
            setTracks(tracks);
            setIsLoading(false);
        };

        loadGroupData();
    }, [groupId]);

    return (
        <div>
            <Navbar />
            <div className="group-container">
                {isLoading ? (
                    <div>Loading group data...</div>
                ) : (
                    <>
                        <section className="group-header">
                            <h1 className="group-name">{group?.name}</h1>
                            <p className="group-description">{group?.description}</p>
                            <div className="group-stats">
                                <div className="stat-item">
                                    <span className="material-icons">group</span>
                                    <span>Members: {group?.memberCount}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="material-icons">calendar_today</span>
                                    <span>Created: {new Date(group?.createdAt || '').toLocaleDateString()}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="material-icons">person</span>
                                    <span>Owner: {group?.owner}</span>
                                </div>
                            </div>
                        </section>
                        <div className="tab-controls">
                            <button
                                className={`tab-button ${activeTab === 'tracks' ? 'active' : ''}`}
                                onClick={() => setActiveTab('tracks')}
                            >
                                Recent Tracks
                            </button>
                            <button
                                className={`tab-button ${activeTab === 'timeline' ? 'active' : ''}`}
                                onClick={() => setActiveTab('timeline')}
                            >
                                Activity Timeline
                            </button>
                        </div>

                        {activeTab === 'tracks' && (
                            <section className="group-tracks">
                                <div className="tracks-grid">
                                    {tracks.map(track => (
                                        <div key={track.id} className="track-card">
                                            <h3>{track.title}</h3>
                                            
                                            <div className="track-stats">
                                                <span>Distance: {track.distance.toFixed(2)}km</span>
                                                <span>Duration: {track.duration.toFixed(2)}h</span>
                                                <span>Date: {new Date(track.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <Link to={`/track/${track.id}`} className="view-track-btn">
                                                View Track
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {activeTab === 'timeline' && (
                            <section className="group-timeline">
                                <TimelineMapView

                                    trackPoints={trackPoints}
                                    isLoading={isLoading}
                                    startDate={startDate}
                                    endDate={endDate}
                                    onStartDateChange={setStartDate}
                                    onEndDateChange={setEndDate}
                                    onLoadPoints={loadTrackPoints}
                                />

                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};