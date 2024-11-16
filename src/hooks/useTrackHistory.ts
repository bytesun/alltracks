import { useState, useEffect } from 'react';
import { TrackPoint } from "../types/TrackPoint";

interface TrackHistoryEntry {
  points: TrackPoint[];
  timestamp: number;
}

export const useTrackHistory = (maxHistory: number = 10) => {
  const [history, setHistory] = useState<TrackHistoryEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const addToHistory = (points: TrackPoint[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, currentIndex + 1);
      return [...newHistory, {
        points: [...points],
        timestamp: Date.now()
      }].slice(-maxHistory);
    });
    setCurrentIndex(prev => prev + 1);
  };

  const undo = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      return history[currentIndex - 1].points;
    }
    return null;
  };

  const redo = () => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return history[currentIndex + 1].points;
    }
    return null;
  };

  return {
    addToHistory,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1
  };
};
