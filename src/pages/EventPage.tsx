import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { listDocs } from "@junobuild/core";
import { TrackPoint } from '../types/TrackPoint';
import { Navbar } from '../components/Navbar';
import { TimelineMapView } from '../components/TimelineMapView';

export const EventPage: React.FC = () => {
    const { eventId } = useParams();
    const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [startDate, setStartDate] = useState<string>(
        new Date(Date.now() - 30*24 * 60 * 60 * 1000).toISOString().split('T')[0]
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
                    key: eventId+"_.*",
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
    }, [eventId]);

    return (
        <div>
            <Navbar />
            <TimelineMapView 
                
                trackPoints={trackPoints}
                isLoading={isLoading}
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onLoadPoints={loadTrackPoints}
            />
        </div>
    );
};
