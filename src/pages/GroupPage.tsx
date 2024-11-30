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
import { useICEvent, useAlltracks } from '../components/Store';
import { UserStats } from '../types/UserStats';
import { TrackAchievements } from '../components/TrackAchievements';
import { parseTracks } from '../utils/trackUtils';

interface TrackData {
    id: string;
    title: string;
    length: number;
    duration: number;
    startime: string;
    description: string;
}

export const GroupPage: React.FC = () => {
    const { groupId } = useParams();
    const alltracks = useAlltracks();
    const [group, setGroup] = useState<Group | null>(null);
    const [tracks, setTracks] = useState<TrackData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'tracks' | 'timeline' | 'photos'>('timeline');
    const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
    const [groupStats, setGroupStats] = useState<UserStats>(null);
    const [startDate, setStartDate] = useState<string>(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState<string>(
        new Date(Date.now()).toISOString().split('T')[0]
    );

    useEffect(() => {

        // icevent.getCalendar(BigInt(groupId)).then((data)=>{
        //     if(data["ok"]){
        //         setGroup({
        //             name: data["ok"].name,
        //             description: data["ok"].description,
        //             calendarId: groupId,
        //             members: [],
        //             groupBadge: ""
        //         })
        //     }

        // })

        alltracks.getGroup(groupId).then((data) => {
            if (data.length > 0) {
                setGroup({
                    name: data[0].name,
                    description: data[0].description,
                    calendarId: groupId,
                    members: [],
                    groupBadge: ""
                });
                // Load group stats
                alltracks.getUserstats(groupId).then((stats) => {
                    console.log(stats)
                    if (stats.length > 0) {
                        setGroupStats({
                            totalDistance: stats[0].totalDistance,
                            totalHours: stats[0].totalHours,
                            totalElevation: stats[0].totalElevation,
                            completedTrails: Number(stats[0].completedTrails),
                            firstHikeDate: new Date(Number(stats[0].firstHikeDate) / 1000000).toLocaleDateString(),
                        });
                    }
                });
            }

        });

    }, [groupId]);

    useEffect(() => {
        loadTrackPoints();
    }, [groupId]);

    useEffect(() => {
        if (groupId) {            
            loadTracks();
        }
    }, [groupId]);

    const loadTracks = async () => {
        setIsLoading(true);
        const tcs = await alltracks.getTracks({group: groupId});
        console.log(tcs)
        const parsedTracks = parseTracks(tcs);

        setTracks(parsedTracks);
       setIsLoading(false);
    };

    const loadTrackPoints = async () => {
        setIsLoading(true);
        const start = BigInt(new Date(startDate).getTime() * 1000000);
        const end = BigInt(new Date(endDate + ' ' + new Date(Date.now()).toISOString().split('T')[1]).getTime() * 1000000);

        // const result = await listDocs({
        //     collection: "live_tracks",

        //     filter: {
        //         matcher: {
        //             key: `.*_${groupId}_.*`,
        //             createdAt: {
        //                 matcher: "between",
        //                 timestamps: { start, end }
        //             }
        //         },
        //         order: {
        //             desc: true,
        //             field: "updated_at"
        //         }
        //     }
        // });

        // const points = result.items.map(doc => doc.data as TrackPoint);
        const result = await alltracks.getCheckpoints({ groupId: groupId }, start, end);
        const points = result.map(point => ({
            latitude: point.latitude,
            longitude: point.longitude,
            timestamp: Number(point.timestamp),
            elevation: point.elevation,
            comment: point.note.length ? point.note[0] : '',
            photo: point.photo.length > 0 ? point.photo[0] : undefined,
        }));


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
                        {groupStats && <div className="group-stats">
                            <span>{groupStats.totalDistance.toFixed(2)} km</span> •
                            <span>{groupStats.totalHours.toFixed(2)} hrs</span> •
                            <span>{(groupStats.totalDistance / (groupStats.totalHours || 1)).toFixed(2)} km/h</span> •
                            <span>{groupStats.totalElevation.toFixed(0)} m elevation</span>
                        </div>}
                    </div>
                    <p className="group-description">{group?.description}</p>
                </section>

                <div className="tab-controls">
                    <button
                        className={`tab-button ${activeTab === 'timeline' ? 'active' : ''}`}
                        onClick={() => setActiveTab('timeline')}
                    >
                        Activity Timeline
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'photos' ? 'active' : ''}`}
                        onClick={() => setActiveTab('photos')}
                    >
                        Photos
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
                                        <span className="track-date">{new Date(track.startime).toLocaleDateString()}</span>
                                        <h3>{track.title}</h3>
                                        <div className="track-details">
                                            <span className="track-stat">
                                                <span className="material-icons">straighten</span>
                                                {track.length} km
                                            </span>
                                            <span className="track-stat">
                                                <span className="material-icons">schedule</span>
                                                {track.duration} hrs
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