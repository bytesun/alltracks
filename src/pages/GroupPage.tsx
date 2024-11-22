import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Doc, getDoc, listDocs } from "@junobuild/core";
import { Navbar } from '../components/Navbar';
import { TrackPoint } from '../types/TrackPoint';
import { TimelineMapView } from '../components/TimelineMapView';
import { PhotosTab } from '../components/PhotosTab';
import { Track } from '../types/Track';
import '../styles/GroupPage.css';
import { Group } from '../types/Group';

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
    const [activeTab, setActiveTab] = useState<'tracks' | 'timeline' | 'photos'>('photos');
    const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);

    const [startDate, setStartDate] = useState<string>(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState<string>(
        new Date(Date.now()).toISOString().split('T')[0]
    );


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
            });
            setTracks(tracks);
            setIsLoading(false);
        };

        loadGroupData();
    }, [groupId]);
    const loadTrackPoints = async () => {
        setIsLoading(true);
        const start = BigInt(new Date(startDate).getTime() * 1000000);
        const end = BigInt(new Date(endDate).getTime() * 1000000);

        const result = await listDocs({
            collection: "live_tracks",

            filter: {
                matcher: {
                    key: `.*_${groupId}_.*`,
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
    return (
        <div>
            <Navbar />
            <div className="group-container">

                <section className="group-header">
                    <div className="group-title">
                        <h1>{group?.name}</h1>

                    </div>
                    <p className="group-description">{group?.description}</p>

                </section>
                <div className="tab-controls">
                    <button
                        className={`tab-button ${activeTab === 'photos' ? 'active' : ''}`}
                        onClick={() => setActiveTab('photos')}
                    >
                        Photos
                    </button>

                    <button
                        className={`tab-button ${activeTab === 'timeline' ? 'active' : ''}`}
                        onClick={() => setActiveTab('timeline')}
                    >
                        Activity Timeline
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'tracks' ? 'active' : ''}`}
                        onClick={() => setActiveTab('tracks')}
                    >
                        Recent Tracks
                    </button>
                </div>


                {activeTab === 'tracks' && (
                    <section className="group-tracks">
                        <div className="tracks-list">
                            {tracks.map(track => (
                                <div key={track.id} className="track-list-item">
                                    <div className="track-info">
                                        <span className="track-date">{new Date(track.createdAt).toLocaleDateString()}</span>
                                        <h3>{track.title}</h3>
                                        <div className="track-details">
                                            <span className="track-stat">
                                                <span className="material-icons">straighten</span>
                                                {track.distance.toFixed(2)} km
                                            </span>
                                            <span className="track-stat">
                                                <span className="material-icons">schedule</span>
                                                {track.duration.toFixed(2)} hrs
                                            </span>
                                        </div>
                                    </div>
                                    <Link to={`/track/${track.id}`} className="view-track-btn">
                                        <span className="material-icons">chevron_right</span>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
                {activeTab === 'timeline' && (
                    <TimelineMapView
                        trackPoints={trackPoints}
                        isLoading={isLoading}
                        startDate={startDate}
                        endDate={endDate}
                        onStartDateChange={setStartDate}
                        onEndDateChange={setEndDate}
                        onLoadPoints={loadTrackPoints}
                    />
                )}
                {activeTab === 'photos' && (
                    <section className="group-photos">
                        <PhotosTab groupId={groupId} />
                    </section>
                )}


            </div>
        </div>
    );
};