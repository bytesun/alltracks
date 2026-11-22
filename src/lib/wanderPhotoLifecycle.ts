import type { HttpAgent } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';
import { uploadOwnedWanderPhoto } from './uploadOwnedWanderPhoto';
import type { WanderGrantBackend } from './wanderPhotoGrant';
import type { PublishedWanderPhotoBinding, WanderPublishedPhotoBackend } from './wanderPublishedPhotos';
import { loadPublishedWanderObjectPhotos } from './wanderPublishedPhotos';
import { createIceStorageUploadActor } from './iceStorageActor';

type Result<T> = { ok: T } | { err: string };

export interface WanderPhotoLifecycleBackend extends WanderGrantBackend, WanderPublishedPhotoBackend {
  prepareOwnedWanderPhotoPublication(objectId: string, storageObjectId: string): Promise<Result<unknown>>;
  publishOwnedWanderPhoto(objectId: string, storageObjectId: string): Promise<Result<boolean>>;
  bindOwnedWanderPhotoToCheckpoint(
    objectId: string, timestamp: bigint, author: Principal, storageObjectId: string,
  ): Promise<Result<boolean>>;
  deleteOwnedWanderPhoto(objectId: string, storageObjectId: string): Promise<Result<boolean>>;
  listWanderCheckpointPhotos(
    objectId: string, timestamp: bigint, author: Principal,
  ): Promise<PublishedWanderPhotoBinding[]>;
}

export type WanderCheckpointIdentity = { timestamp: bigint; author: Principal };

function unwrap<T>(result: Result<T>, operation: string): T {
  if ('err' in result) throw new Error(`${operation}: ${result.err}`);
  return result.ok;
}

/**
 * End-to-end owner-only upload -> durable publication -> optional Checkpoint
 * binding. A failure after upload may leave an ICEStorage object behind:
 * surface its ID for explicit reconciliation rather than silently reuploading.
 */
export async function publishOwnedWanderPhoto(
  file: File,
  objectId: string,
  agent: HttpAgent,
  backend: WanderPhotoLifecycleBackend,
  checkpoint?: WanderCheckpointIdentity,
  onProgress?: (uploadedBytes: number, totalBytes: number) => void,
): Promise<{ storageObjectId: string }> {
  const uploaded = await uploadOwnedWanderPhoto(file, objectId, agent, backend, onProgress);
  try {
    unwrap(await backend.prepareOwnedWanderPhotoPublication(objectId, uploaded.objectId), 'Prepare photo');
    if (unwrap(await backend.publishOwnedWanderPhoto(objectId, uploaded.objectId), 'Publish photo') !== true) {
      throw new Error('Publish photo was not confirmed.');
    }
    if (checkpoint && unwrap(
      await backend.bindOwnedWanderPhotoToCheckpoint(
        objectId, checkpoint.timestamp, checkpoint.author, uploaded.objectId,
      ),
      'Bind photo to Checkpoint',
    ) !== true) {
      throw new Error('Checkpoint photo binding was not confirmed.');
    }
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`${reason}. Uploaded storage object: ${uploaded.objectId}. Reconcile before retrying.`);
  }
  return { storageObjectId: uploaded.objectId };
}

/** Read public photos through trusted Alltracks bindings, never raw object IDs. */
export async function loadWanderPhotos(
  objectId: string,
  agent: HttpAgent,
  backend: WanderPhotoLifecycleBackend,
): Promise<Array<{ storageObjectId: string; blob: Blob }>> {
  return loadPublishedWanderObjectPhotos(backend, createIceStorageUploadActor(agent), objectId);
}

export async function deleteWanderPhoto(
  objectId: string,
  storageObjectId: string,
  backend: WanderPhotoLifecycleBackend,
): Promise<void> {
  if (unwrap(await backend.deleteOwnedWanderPhoto(objectId, storageObjectId), 'Delete photo') !== true) {
    throw new Error('Photo deletion was not confirmed.');
  }
}
