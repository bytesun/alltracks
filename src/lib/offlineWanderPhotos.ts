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
  checkinRequestId?: string;
  attempts: number;
  lastError: string;
  nextAttemptAt: number;
  /** ICEStorage session to reconcile after an uncertain finalize. */
  storageSessionId?: string;
  uploadedStorageObjectId?: string;
};

// Store plain bytes, not a browser File/Blob handle. On some mobile browsers
// a gallery-backed File is only readable while the picker has access to it;
// serializing that handle to IndexedDB can fail with InvalidBlob.
type StoredPendingWanderPhoto = Omit<PendingWanderPhoto, 'file'> & {
  photoBytes?: ArrayBuffer;
  fileName?: string;
  fileType?: string;
  fileLastModified?: number;
  /** Legacy v1 outbox entries are still readable without a destructive migration. */
  file?: File;
};

const database = () => openDB(DB, 1, { upgrade(db) {
  if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
} });
const announce = () => window.dispatchEvent(new Event(WANDER_PHOTO_OUTBOX_EVENT));

function storedPhotoSize(item: StoredPendingWanderPhoto): number {
  return item.photoBytes?.byteLength ?? item.file?.size ?? MAX_TOTAL_BYTES;
}

function restorePhoto(item: StoredPendingWanderPhoto): PendingWanderPhoto {
  const { photoBytes, fileName, fileType, fileLastModified, ...rest } = item;
  const file = photoBytes instanceof ArrayBuffer
    ? new File([photoBytes], fileName || 'wander-photo.jpg', {
      type: fileType || 'image/jpeg',
      lastModified: fileLastModified ?? item.createdAt,
    })
    : item.file;
  if (!file) throw new Error('A saved photo is missing its local image data.');
  return { ...rest, file };
}

async function storePhoto(item: PendingWanderPhoto): Promise<void> {
  validateWanderPhoto(item.file);
  // Read before starting the IndexedDB transaction (transactions cannot await
  // a File read). Never persist the original File object as a structured clone.
  const photoBytes = await item.file.arrayBuffer();
  if (photoBytes.byteLength !== item.file.size) {
    throw new Error('Photo data changed while saving. Please select it again.');
  }
  const { file, ...metadata } = item;
  await (await database()).put(STORE, {
    ...metadata,
    photoBytes,
    fileName: file.name,
    fileType: file.type,
    fileLastModified: file.lastModified,
  } satisfies StoredPendingWanderPhoto);
  announce();
}

export async function listPendingWanderPhotos(objectId?: string): Promise<PendingWanderPhoto[]> {
  const db = await database();
  const all = await db.getAll(STORE) as StoredPendingWanderPhoto[];
  return all.filter(item => !objectId || item.objectId === objectId)
    .sort((a, b) => a.createdAt - b.createdAt).map(restorePhoto);
}

export async function queueWanderPhoto(input: {
  objectId: string; file: File; principal: string | null;
  checkpoint?: { timestamp: bigint; author: string };
  checkinRequestId?: string;
}): Promise<string> {
  validateWanderPhoto(input.file);
  if (!/^obj-[a-z0-9-]{5,256}$/i.test(input.objectId)) throw new Error('Invalid Wander Object ID.');
  const db = await database();
  const all = await db.getAll(STORE) as StoredPendingWanderPhoto[];
  if (all.length >= MAX_ITEMS ||
      all.reduce((sum, item) => sum + storedPhotoSize(item), input.file.size) > MAX_TOTAL_BYTES) {
    throw new Error('Local photo queue is full. Upload or remove pending photos first.');
  }
  const id = crypto.randomUUID();
  await storePhoto({
    id, objectId: input.objectId, file: input.file, principal: input.principal,
    createdAt: Date.now(), attempts: 0, lastError: '', nextAttemptAt: 0,
    checkinRequestId: input.checkinRequestId,
    checkpoint: input.checkpoint ? {
      timestamp: String(input.checkpoint.timestamp), author: input.checkpoint.author,
    } : undefined,
  });
  return id;
}

export async function removePendingWanderPhoto(id: string): Promise<void> {
  await (await database()).delete(STORE, id);
  announce();
}

export async function updatePendingWanderPhoto(item: PendingWanderPhoto): Promise<void> {
  await storePhoto(item);
}
