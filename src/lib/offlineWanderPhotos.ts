import { openDB } from 'idb';
import { validateWanderPhoto } from './iceStorageUpload';

export const WANDER_PHOTO_OUTBOX_EVENT = 'alltracks:wander-photo-outbox-updated';
const DB = 'alltracks-wander-photo-outbox';
const STORE = 'photos';
const MAX_ITEMS = 30;
const MAX_TOTAL_BYTES = 60 * 1024 * 1024;
export type PendingWanderPhoto = {
  id: string;
  objectId: string;
  file: File;
  principal: string | null;
  createdAt: number;
  checkpoint?: { timestamp: string; author: string };
  attempts: number;
  lastError: string;
  nextAttemptAt: number;
};
const database = () => openDB(DB, 1, { upgrade(db) {
  if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
} });
const announce = () => window.dispatchEvent(new Event(WANDER_PHOTO_OUTBOX_EVENT));
export async function listPendingWanderPhotos(objectId?: string): Promise<PendingWanderPhoto[]> {
  const db = await database();
  const all = await db.getAll(STORE) as PendingWanderPhoto[];
  return all.filter(item => !objectId || item.objectId === objectId).sort((a, b) => a.createdAt - b.createdAt);
}
export async function queueWanderPhoto(input: {
  objectId: string; file: File; principal: string | null;
  checkpoint?: { timestamp: bigint; author: string };
}): Promise<string> {
  validateWanderPhoto(input.file);
  if (!/^obj-[a-z0-9-]{5,256}$/i.test(input.objectId)) throw new Error('Invalid Wander Object ID.');
  const db = await database();
  const all = await db.getAll(STORE) as PendingWanderPhoto[];
  if (all.length >= MAX_ITEMS || all.reduce((sum, item) => sum + item.file.size, input.file.size) > MAX_TOTAL_BYTES) {
    throw new Error('Local photo queue is full. Upload or remove pending photos first.');
  }
  const id = crypto.randomUUID();
  await db.put(STORE, {
    id, objectId: input.objectId, file: input.file, principal: input.principal,
    createdAt: Date.now(), attempts: 0, lastError: '', nextAttemptAt: 0,
    checkpoint: input.checkpoint ? { timestamp: String(input.checkpoint.timestamp), author: input.checkpoint.author } : undefined,
  } satisfies PendingWanderPhoto);
  announce();
  return id;
}
export async function removePendingWanderPhoto(id: string): Promise<void> {
  await (await database()).delete(STORE, id);
  announce();
}
export async function updatePendingWanderPhoto(item: PendingWanderPhoto): Promise<void> {
  await (await database()).put(STORE, item);
  announce();
}
