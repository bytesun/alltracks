import { openDB } from 'idb';
import { TrackPoint } from '../types/TrackPoint';
const DB_NAME = 'tracks-db';
const STORE_NAME = 'tracks';
const DB_VERSION = 1;

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

// Call this when your app starts
export const setupIndexedDB = async () => {
  await initDB();
};

export const saveTrackPointsToIndexDB = async (trackId: string, points: TrackPoint[], trackType?: string) => {
  const db = await openDB(DB_NAME, DB_VERSION);
  await db.put(STORE_NAME, {
    id: trackId,
    points: points,
    timestamp: Date.now(),
    trackType: trackType || 'hiking',
  });
};
export const getTrackPointsFromIndexDB = async (trackId: string | null) => {
  if (!trackId) {
    return { points: [], trackType: 'hiking' };
  }
  const db = await openDB(DB_NAME, DB_VERSION);
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const result = await store.get(trackId);
  return { points: result?.points || [], trackType: result?.trackType || 'hiking' };
};

// Clear specific track
export const clearTrackFromIndexDB = async (trackId: string) => {
  const db = await openDB(DB_NAME, DB_VERSION);
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await store.delete(trackId);
};

// Clear all tracks
export const clearAllTracksFromIndexDB = async () => {
  const db = await openDB(DB_NAME, DB_VERSION);
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await store.clear();
};


export const getAllTracksFromIndexDB = async () => {
  const db = await openDB(DB_NAME, DB_VERSION);
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const allTracks = await store.getAll();
  return allTracks || [];
};
