import { useState, useMemo } from 'react';
import { TrackPoint } from "../types/TrackPoint";

export const useTrackSearch = (trackPoints: TrackPoint[]) => {
  const [searchQuery, setSearchQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return trackPoints;

    return trackPoints.filter(point => {
      const searchLower = searchQuery.toLowerCase();
      const comment = point.comment?.toLowerCase() || '';
      const time = new Date(point.timestamp).toLocaleString().toLowerCase();
      
      return (
        comment.includes(searchLower) ||
        time.includes(searchLower) ||
        point.latitude.toString().includes(searchQuery) ||
        point.longitude.toString().includes(searchQuery)
      );
    });
  }, [trackPoints, searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults
  };
};
