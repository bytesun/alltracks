import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { TrackPoint } from '../types/TrackPoint';
import { listDocs,getDoc } from "@junobuild/core";
import 'leaflet/dist/leaflet.css';
import 'leaflet/dist/images/marker-shadow.png';

import { Navbar } from '../components/Navbar';
import { TimelineMapView } from '../components/TimelineMapView';
import { TrackAchievements } from '../components/TrackAchievements';
import { UserStats } from '../types/UserStats';

export const UserPage: React.FC = () => {
    const { userKey } = useParams();
    const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [startDate, setStartDate] = useState<string>(
        new Date(Date.now() - 30*24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    const [endDate, setEndDate] = useState<string>(
        new Date(Date.now()).toISOString().split('T')[0]
    );
    const [userStats, setUserStats] = useState<UserStats>({
        totalDistance: 0,
        totalHours: 0,
        totalElevation: 0,
        completedTrails: 0,
        firstHikeDate: new Date().toDateString(),
      });
      
    useEffect(() => {
        const loadUserStats = async () => {
          const statDoc = await getDoc<UserStats>({
            collection: "stats",
            key: userKey,
          });
          setUserStats(statDoc?.data || {
            totalDistance: 0,
            totalHours: 0,
            totalElevation: 0,
            completedTrails: 0,
            firstHikeDate: new Date().toDateString(),
          });
        };
    
        if (userKey) {
          loadUserStats();
        }
      }, [userKey]);

    const loadTrackPoints = async () => {
        setIsLoading(true);
        const start = BigInt(new Date(startDate).getTime() * 1000000);
        const end = BigInt(new Date(endDate + ' ' + new Date(Date.now()).toISOString().split('T')[1]).getTime() * 1000000);

        const result = await listDocs({
            collection: "live_tracks",
            filter: {
                owner: userKey,
                matcher: {
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
    }, [userKey]);

    return (
        <div>
            <Navbar />
            <TrackAchievements stats={userStats} />
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
