import { openDB } from 'idb';
import { TrackPoint } from './exportFormats';

export const saveTrackPointsToIndexDB = async (trackId: string, points: TrackPoint[]) => {
  const db = await openDB('tracks-db', 1, {
    upgrade(db) {
      db.createObjectStore('active-tracks', { keyPath: 'id' });
    },
  });

  await db.put('active-tracks', {
    id: trackId,
    points: points,
    timestamp: Date.now()
  });
};

export const getTrackPointsFromIndexDB = async (trackId: string) => {
  const db = await openDB('tracks-db', 1);
  const track = await db.get('active-tracks', trackId);
  return track?.points || [];
};
