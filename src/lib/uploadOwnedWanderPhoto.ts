import type { HttpAgent } from '@dfinity/agent';
import { createIceStorageUploadActor } from './iceStorageActor';
import { createAuthorizedStorageTransport } from './iceStorageActorTransport';
import { createWanderGrantProvider, type WanderGrantBackend } from './wanderPhotoGrant';
import { uploadWanderPhoto, type UploadedPhoto } from './iceStorageUpload';

/**
 * Signed-in owner upload pipeline.
 *
 * Both actors MUST use the same authenticated agent / principal.
 * The returned objectId is NOT a public URL; do not insert it into the
 * existing HTTPS photoUrl field until a certified public-read resolver and
 * reference lifecycle have been implemented.
 */
export async function uploadOwnedWanderPhoto(
  file: File,
  objectId: string,
  authenticatedAgent: HttpAgent,
  alltracksBackend: WanderGrantBackend,
  onProgress?: (uploadedBytes: number, totalBytes: number) => void,
): Promise<UploadedPhoto> {
  const storage = createIceStorageUploadActor(authenticatedAgent);
  const grant = createWanderGrantProvider(alltracksBackend);
  return uploadWanderPhoto(
    file,
    objectId,
    createAuthorizedStorageTransport(storage, grant),
    onProgress,
  );
}
