import type { ActorSubclass } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';
import type { _SERVICE, CheckPoint, Track } from '../alltracks/backend.did';

export type Action = 'found' | 'carried' | 'left';
export type ObjectRecord = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  createdAt: string;
  owner: string;
};
export type JourneyCheckin = {
  id: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  action: Action;
  note: string;
  createdAt: string;
};
type Backend = ActorSubclass<_SERVICE>;

const PREFIX = 'alltracks:object:v1:';
export const OBJECT_ID_PREFIX = 'obj-';
const CHECKIN_PREFIX = 'alltracks:object-checkin:v1:';

export const objectLink = (id: string): string => {
  // Object IDs are generated, not used as arbitrary URLs.
  return window.location.origin + '/object/' + encodeURIComponent(id);
};

const objectFromTrack = (track: Track): ObjectRecord | null => {
  if (!track.id.startsWith(OBJECT_ID_PREFIX) || !track.description.startsWith(PREFIX)) return null;
  try {
    const data = JSON.parse(track.description.slice(PREFIX.length));
    if (!data || typeof data !== 'object' || typeof data.description !== 'string') return null;
    return {
      id: track.id,
      name: track.name,
      description: data.description.slice(0, 500),
      emoji: typeof data.emoji === 'string' ? data.emoji.slice(0, 4) : '📦',
      createdAt: new Date(Number(track.startime / 1_000_000n)).toISOString(),
      owner: track.createdBy.toText(),
    };
  } catch {
    return null;
  }
};

export const getObject = async (backend: Backend, objectId: string): Promise<ObjectRecord | null> => {
  if (!/^obj-[a-z0-9-]{12,65}$/.test(objectId)) return null;
  const found = await backend.getTrack(objectId);
  return found.length && found[0].isPublic ? objectFromTrack(found[0]) : null;
};

export const getMyObjects = async (backend: Backend, principal: Principal): Promise<ObjectRecord[]> => {
  // Reuse canonical owner filtering; do not put a separate owner index in browser storage.
  const pageSize = 100n;
  const result: ObjectRecord[] = [];
  for (let page = 0n; page < 20n; page++) {
    const tracks = await backend.getTracks({ user: principal }, page, pageSize);
    for (const track of tracks) {
      const object = objectFromTrack(track);
      if (object && object.owner === principal.toText()) result.push(object);
    }
    if (tracks.length < Number(pageSize)) break;
  }
  return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const createObject = async (
  backend: Backend,
  name: string,
  description: string,
  emoji: string,
): Promise<ObjectRecord> => {
  const cleanName = name.trim().slice(0, 100);
  if (!cleanName) throw new Error('Enter an object name.');
  const id = OBJECT_ID_PREFIX + crypto.randomUUID();
  const now = BigInt(Date.now()) * 1_000_000n;
  const result = await backend.createTrack({
    id,
    name: cleanName,
    description: PREFIX + JSON.stringify({
      description: description.trim().slice(0, 500),
      emoji: emoji.trim().slice(0, 4) || '📦',
    }),
    duration: 0,
    elevation: 0,
    groupId: [],
    length: 0,
    isPublic: true,
    startime: now,
    // Object registration does not require a user's location.
    startPoint: { latitude: 0, longitude: 0 },
    trackType: { other: null },
    trackfile: { fileType: 'application/x.alltracks.object+json', url: '' },
  });
  if ('err' in result) throw new Error(result.err);
  const saved = objectFromTrack(result.ok);
  if (!saved) throw new Error('Object saved but could not be decoded; check the returned track.');
  return saved;
};

const parseCheckpoint = (point: CheckPoint, index: number): JourneyCheckin | null => {
  if (!point.isPublic || !point.note.startsWith(CHECKIN_PREFIX)) return null;
  try {
    const data = JSON.parse(point.note.slice(CHECKIN_PREFIX.length));
    if (!['found', 'carried', 'left'].includes(data.action)) return null;
    return {
      id: point.createdBy.toText() + '-' + point.timestamp.toString() + '-' + index,
      latitude: point.latitude,
      longitude: point.longitude,
      accuracyMeters: typeof data.accuracyMeters === 'number' ? data.accuracyMeters : null,
      action: data.action,
      note: typeof data.note === 'string' ? data.note.slice(0, 280) : '',
      createdAt: new Date(Number(point.timestamp / 1_000_000n)).toISOString(),
    };
  } catch {
    return null;
  }
};

export const loadObjectCheckins = async (backend: Backend, id: string): Promise<JourneyCheckin[]> => {
  const points = await backend.getCheckPointsByTrackId(id);
  return points
    .map(parseCheckpoint).filter((point): point is JourneyCheckin => point !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const submitObjectCheckin = async (
  backend: Backend,
  objectId: string,
  input: {
    latitude: number; longitude: number; accuracyMeters: number;
    action: Action; note: string;
  },
): Promise<void> => {
  if (!/^obj-[a-z0-9-]{12,65}$/.test(objectId)) throw new Error('Invalid object ID.');
  if (![input.latitude, input.longitude, input.accuracyMeters].every(Number.isFinite) ||
      Math.abs(input.latitude) > 90 || Math.abs(input.longitude) > 180 ||
      input.accuracyMeters < 0 || input.accuracyMeters > 2000) {
    throw new Error('Invalid GPS coordinates or accuracy.');
  }
  const target = await getObject(backend, objectId);
  if (!target) throw new Error('This object is not available.');
  const result = await backend.createCheckpoint({
    // Never publish the exact browser GPS coordinates.
    latitude: Number(input.latitude.toFixed(3)),
    longitude: Number(input.longitude.toFixed(3)),
    elevation: 0,
    groupId: [],
    isPublic: true,
    timestamp: BigInt(Date.now()) * 1_000_000n,
    trackId: objectId,
    photo: [],
    note: CHECKIN_PREFIX + JSON.stringify({
      action: input.action,
      accuracyMeters: Math.round(input.accuracyMeters),
      note: input.note.trim().slice(0, 280),
    }),
  });
  if ('err' in result) throw new Error(result.err);
};
