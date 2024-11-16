import { useMemo } from 'react';
import { TrackPoint } from '../types/TrackPoint';

interface AnalyticsData {
  maxSpeed: number;
  averageSpeed: number;
  maxElevation: number;
  minElevation: number;
  totalAscent: number;
  totalDescent: number;
  segmentSpeeds: number[];
}

export const useTrackAnalytics = (trackPoints: TrackPoint[]) => {
  const analytics = useMemo((): AnalyticsData => {
    const speeds: number[] = [];
    let totalAscent = 0;
    let totalDescent = 0;

    for (let i = 1; i < trackPoints.length; i++) {
      // Calculate segment speed
      const timeDiff = (trackPoints[i].timestamp - trackPoints[i-1].timestamp) / 1000; // seconds
      const distance = calculateDistance(
        trackPoints[i-1].latitude,
        trackPoints[i-1].longitude,
        trackPoints[i].latitude,
        trackPoints[i].longitude
      );
      const speed = (distance / timeDiff) * 3600; // km/h
      speeds.push(speed);

      // Calculate elevation changes
      const elevDiff = (trackPoints[i].elevation ?? 0) - (trackPoints[i-1].elevation ?? 0);
      if (elevDiff > 0) totalAscent += elevDiff;
      if (elevDiff < 0) totalDescent += Math.abs(elevDiff);
    }

    const elevations = trackPoints.map(p => p.elevation ?? 0);

    return {
      maxSpeed: Math.max(...speeds),
      averageSpeed: speeds.reduce((a, b) => a + b, 0) / speeds.length,
      maxElevation: Math.max(...elevations),
      minElevation: Math.min(...elevations),
      totalAscent,
      totalDescent,
      segmentSpeeds: speeds
    };
  }, [trackPoints]);

  return analytics;
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};
