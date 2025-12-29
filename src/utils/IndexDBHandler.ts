import { openDB } from 'idb';
import { TrackPoint } from '../types/TrackPoint';
const DB_NAME = 'tracks-db';
const STORE_NAME = 'tracks';
const DB_VERSION = 2;

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
      if (!db.objectStoreNames.contains('spots')) {
        db.createObjectStore('spots', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('comments')) {
        db.createObjectStore('comments', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

// Call this when your app starts
export const setupIndexedDB = async () => {
  await initDB();
};

export const saveTrackPointsToIndexDB = async (trackId: string, points: TrackPoint[], trackType?: string, trackName?: string, groupId?: string) => {
  const db = await openDB(DB_NAME, DB_VERSION);
  await db.put(STORE_NAME, {
    id: trackId,
    points: points,
    timestamp: Date.now(),
    trackType: trackType || 'hiking',
    name: trackName,
    groupId: groupId,
  });
};
export const getTrackPointsFromIndexDB = async (trackId: string | null) => {
  if (!trackId) {
    return { points: [], trackType: 'hiking', name: undefined, groupId: undefined };
  }
  const db = await openDB(DB_NAME, DB_VERSION);
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const result = await store.get(trackId);
  return { points: result?.points || [], trackType: result?.trackType || 'hiking', name: result?.name, groupId: result?.groupId };
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

// Get track metadata (name, type, etc.)
export const getTrackMetadataFromIndexDB = async (trackId: string) => {
  try {
    const db = await openDB('tracks-db', 2);
    const track = await db.get('tracks', trackId);
    return track || null;
  } catch (error) {
    console.error('Error getting track metadata:', error);
    return null;
  }
};

// Spots helpers
export const saveSpotToIndexDB = async (spot: { id: string; name: string; latitude: number; longitude: number; timestamp: number }) => {
  const db = await openDB(DB_NAME, DB_VERSION);
  await db.put('spots', spot);
};

export const getAllSpotsFromIndexDB = async () => {
  const db = await openDB(DB_NAME, DB_VERSION);
  const tx = db.transaction('spots', 'readonly');
  const store = tx.objectStore('spots');
  const all = await store.getAll();
  return all || [];
};

export const getSpotFromIndexDB = async (id: string) => {
  const db = await openDB(DB_NAME, DB_VERSION);
  return await db.get('spots', id);
};

export const clearSpotFromIndexDB = async (id: string) => {
  const db = await openDB(DB_NAME, DB_VERSION);
  const tx = db.transaction('spots', 'readwrite');
  const store = tx.objectStore('spots');
  await store.delete(id);
};

// Comments helpers (comments stored with id auto-increment; include spotId)
export const saveCommentToIndexDB = async (spotId: string, comment: { author: string; text: string; timestamp: number }) => {
  const db = await openDB(DB_NAME, DB_VERSION);
  const tx = db.transaction('comments', 'readwrite');
  const store = tx.objectStore('comments');
  await store.add({ spotId, ...comment });
};

export const getCommentsForSpot = async (spotId: string) => {
  const db = await openDB(DB_NAME, DB_VERSION);
  const tx = db.transaction('comments', 'readonly');
  const store = tx.objectStore('comments');
  const all = await store.getAll();
  return (all || []).filter((c: any) => c.spotId === spotId);
};
