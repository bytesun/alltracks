import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from './backend.did.js';
import type { _SERVICE, Action } from './backend.did';

export type JourneyAction = 'found' | 'carried' | 'left';
export type JourneyCheckin = {
  id: string;
  objectId: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  action: JourneyAction;
  note: string;
  createdAt: string;
};
export type LocationReport = {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  action: JourneyAction;
  note: string;
};

let cached: _SERVICE | undefined;

const actor = (): _SERVICE => {
  const canisterId = import.meta.env.VITE_OBJECT_JOURNEY_CANISTER_ID?.trim();
  if (!canisterId) {
    throw new Error('Object Journey ICP canister is not configured yet.');
  }
  if (!cached) {
    const host = import.meta.env.VITE_ICP_HOST?.trim() || 'https://ic0.app';
    const agent = new HttpAgent({ host });
    cached = Actor.createActor<_SERVICE>(idlFactory, { agent, canisterId });
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      void agent.fetchRootKey().catch(() => undefined);
    }
  }
  return cached;
};

const toAction = (action: Action): JourneyAction => {
  if ('found' in action) return 'found';
  if ('left' in action) return 'left';
  return 'carried';
};

const decode = (record: Awaited<ReturnType<_SERVICE['getCheckins']>>[number]): JourneyCheckin => ({
  id: record.id.toString(),
  objectId: record.objectId,
  latitude: record.latitude,
  longitude: record.longitude,
  accuracyMeters: record.accuracyMeters.length ? Number(record.accuracyMeters[0]) : null,
  action: toAction(record.action),
  note: record.note,
  createdAt: new Date(Number(record.createdAt / 1_000_000n)).toISOString(),
});

export const loadObjectCheckins = async (id: string): Promise<JourneyCheckin[]> =>
  (await actor().getCheckins(id)).map(decode);

export const submitObjectCheckin = async (id: string, input: LocationReport): Promise<JourneyCheckin> => {
  const action: Action = input.action === 'found'
    ? { found: null } : input.action === 'left' ? { left: null } : { carried: null };
  const result = await actor().addCheckin(id, {
    // Round on the client too: never send exact device GPS coordinates to the network.
    latitude: Number(input.latitude.toFixed(3)),
    longitude: Number(input.longitude.toFixed(3)),
    accuracyMeters: [BigInt(Math.round(input.accuracyMeters))],
    action,
    note: input.note.slice(0, 280),
  });
  if ('err' in result) throw new Error(result.err);
  return decode(result.ok);
};
