import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAlltracks } from '../components/Store';
import { parseTracks } from '../utils/trackUtils';

interface TrackData {
    id: string;
    title: string;
    length: number;
    duration: number;
    startime: string;
    description: string;
}

interface GroupTracksProps {
    groupId: string;
}

export const GroupTracks: React.FC<GroupTracksProps> = ({ groupId }) => {
    const alltracks = useAlltracks();
    const [tracks, setTracks] = useState<TrackData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadTracks();
    }, []);

    const loadTracks = async () => {
        setIsLoading(true);
        const tcs = await alltracks.getTracks({group: groupId});
        const parsedTracks = parseTracks(tcs);
        const sortedTracks = parsedTracks.sort((a, b) => 
            new Date(b.startime).getTime() - new Date(a.startime).getTime()
        );
        setTracks(sortedTracks);
        setIsLoading(false);
    };

    return (
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
    );
};
