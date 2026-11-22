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
  listPendingWanderPhotoCleanup(objectId: string): Promise<string[]>;
  retryWanderPhotoCleanup(objectId: string, storageObjectId: string): Promise<Result<boolean>>;
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
  storageCanisterId?: string,
): Promise<{ storageObjectId: string }> {
  const uploaded = await uploadOwnedWanderPhoto(file, objectId, agent, backend, onProgress, storageCanisterId);
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

/** Resume publication after a lost response without uploading the same bytes again. */
export async function resumeOwnedWanderPhotoPublication(
  objectId: string,
  storageObjectId: string,
  backend: WanderPhotoLifecycleBackend,
  checkpoint?: WanderCheckpointIdentity,
): Promise<void> {
  unwrap(await backend.prepareOwnedWanderPhotoPublication(objectId, storageObjectId), 'Prepare photo');
  if (unwrap(await backend.publishOwnedWanderPhoto(objectId, storageObjectId), 'Publish photo') !== true) {
    throw new Error('Publication not confirmed; retry reconciliation.');
  }
  if (checkpoint && unwrap(await backend.bindOwnedWanderPhotoToCheckpoint(
    objectId, checkpoint.timestamp, checkpoint.author, storageObjectId,
  ), 'Bind photo to Checkpoint') !== true) {
    throw new Error('Checkpoint binding not confirmed; retry reconciliation.');
  }
}

/** Read public photos through trusted Alltracks bindings, never raw object IDs. */
export async function loadWanderPhotos(
  objectId: string,
  agent: HttpAgent,
  backend: WanderPhotoLifecycleBackend,
  storageCanisterId?: string,
): Promise<Array<{ storageObjectId: string; blob: Blob }>> {
  return loadPublishedWanderObjectPhotos(backend, createIceStorageUploadActor(agent, storageCanisterId), objectId);
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

/**
 * Advance a bounded batch of tombstoned photos. This is an explicit recovery
 * operation, not a replacement for an eventual backend cleanup worker.
 */
export async function reconcileWanderPhotoCleanup(
  objectId: string,
  backend: WanderPhotoLifecycleBackend,
): Promise<{ cleaned: number; pending: number; errors: string[] }> {
  const ids = await backend.listPendingWanderPhotoCleanup(objectId);
  let cleaned = 0;
  const errors: string[] = [];
  for (const id of ids.slice(0, 20)) {
    try {
      if (unwrap(await backend.retryWanderPhotoCleanup(objectId, id), 'Revoke photo') === true) {
        cleaned++;
      }
    } catch (error) {
      errors.push(`${id}: ${error instanceof Error ? error.message : String(error)}`);
      // Backend applies a global cooldown. Do not hammer it with more requests.
      break;
    }
  }
  return { cleaned, pending: ids.length - cleaned, errors };
}
