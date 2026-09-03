import { openDB } from 'idb';
import { TrackPoint } from '../types/TrackPoint';
import { CompletedActivity } from '../types/CompletedActivity';

const DB_NAME = 'tracks-db';
const STORE_NAME = 'tracks';
const ACTIVITY_HISTORY_STORE = 'activity-history';
const DB_VERSION = 3;

const openTracksDB = () => openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('spots')) {
      db.createObjectStore('spots', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('comments')) {
      db.createObjectStore('comments', { keyPath: 'id', autoIncrement: true });
    }
    if (!db.objectStoreNames.contains(ACTIVITY_HISTORY_STORE)) {
      db.createObjectStore(ACTIVITY_HISTORY_STORE, { keyPath: 'id' });
    }
  },
});

export const initDB = () => openTracksDB();

export const setupIndexedDB = async () => {
  await openTracksDB();
};

export const saveTrackPointsToIndexDB = async (trackId: string, points: TrackPoint[], trackType?: string, trackName?: string, groupId?: string) => {
  const db = await openTracksDB();
  await db.put(STORE_NAME, {
    id: trackId,
    points,
    timestamp: Date.now(),
    trackType: trackType || 'hiking',
    name: trackName,
    groupId,
  });
};

export const getTrackPointsFromIndexDB = async (trackId: string | null) => {
  if (!trackId) {
    return { points: [], trackType: 'hiking', name: undefined, groupId: undefined };
  }
  const db = await openTracksDB();
  const result = await db.get(STORE_NAME, trackId);
  return {
    points: result?.points || [],
    trackType: result?.trackType || 'hiking',
    name: result?.name,
    groupId: result?.groupId,
  };
};

export const clearTrackFromIndexDB = async (trackId: string) => {
  const db = await openTracksDB();
  await db.delete(STORE_NAME, trackId);
};

export const clearAllTracksFromIndexDB = async () => {
  const db = await openTracksDB();
  await db.clear(STORE_NAME);
};

export const getAllTracksFromIndexDB = async () => {
  const db = await openTracksDB();
  return await db.getAll(STORE_NAME) || [];
};

export const getTrackMetadataFromIndexDB = async (trackId: string) => {
  try {
    const db = await openTracksDB();
    return await db.get(STORE_NAME, trackId) || null;
  } catch (error) {
    console.error('Error getting track metadata:', error);
    return null;
  }
};

// Repeated saves update the same history item. A snapshot exported while a track
// is active is therefore replaced by the final version when the user finishes.
export const saveCompletedActivityToIndexDB = async (activity: CompletedActivity) => {
  const db = await openTracksDB();
  await db.put(ACTIVITY_HISTORY_STORE, activity);
};

export const getCompletedActivityFromIndexDB = async (activityId: string) => {
  const db = await openTracksDB();
  return await db.get(ACTIVITY_HISTORY_STORE, activityId) as CompletedActivity | undefined;
};

export const getCompletedActivitiesFromIndexDB = async (): Promise<CompletedActivity[]> => {
  const db = await openTracksDB();
  const activities = await db.getAll(ACTIVITY_HISTORY_STORE) as CompletedActivity[];
  return activities.sort((a, b) => b.completedAt - a.completedAt);
};

export const clearCompletedActivityFromIndexDB = async (activityId: string) => {
  const db = await openTracksDB();
  await db.delete(ACTIVITY_HISTORY_STORE, activityId);
};

// Spots helpers
export const saveSpotToIndexDB = async (spot: { id: string; name: string; latitude: number; longitude: number; timestamp: number }) => {
  const db = await openTracksDB();
  await db.put('spots', spot);
};

export const getAllSpotsFromIndexDB = async () => {
  const db = await openTracksDB();
  return await db.getAll('spots') || [];
};

export const getSpotFromIndexDB = async (id: string) => {
  const db = await openTracksDB();
  return await db.get('spots', id);
};

export const clearSpotFromIndexDB = async (id: string) => {
  const db = await openTracksDB();
  await db.delete('spots', id);
};

// Comments helpers (comments stored with id auto-increment; include spotId)
export const saveCommentToIndexDB = async (spotId: string, comment: { author: string; text: string; timestamp: number }) => {
  const db = await openTracksDB();
  await db.add('comments', { spotId, ...comment });
};

export const getCommentsForSpot = async (spotId: string) => {
  const db = await openTracksDB();
  const all = await db.getAll('comments');
  return (all || []).filter((comment: any) => comment.spotId === spotId);
};
