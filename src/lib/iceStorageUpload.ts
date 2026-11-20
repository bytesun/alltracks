/**
 * ICEStorage upload boundary for Wander photos.
 *
 * This module deliberately does not mint grants, hold gateway credentials,
 * or assume that a completed upload is publicly readable. Callers must
 * provide an authenticated transport implementing the reviewed ICEStorage
 * session protocol. The existing photo-URL check-in path remains unchanged.
 */
export const MAX_WANDER_PHOTO_BYTES = 10 * 1024 * 1024;
export const WANDER_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type WanderPhotoType = typeof WANDER_PHOTO_TYPES[number];

export interface AuthorizedPhotoSession {
  sessionId: string;
  /** Maximum accepted chunk size returned by the storage service. */
  chunkSize: number;
}

export interface UploadedPhoto {
  /** Opaque storage object identifier, not an arbitrary external URL. */
  objectId: string;
}

export interface WanderPhotoTransport {
  /** Requires a grant already bound to the signed-in user's Principal. */
  begin(file: File, resourceId: string): Promise<AuthorizedPhotoSession>;
  uploadChunk(sessionId: string, index: number, bytes: Uint8Array): Promise<void>;
  finish(sessionId: string): Promise<UploadedPhoto>;
  /** Best-effort cancellation; backend expiry/recovery remains authoritative. */
  cancel?(sessionId: string): Promise<void>;
}

export function validateWanderPhoto(file: File): WanderPhotoType {
  if (!WANDER_PHOTO_TYPES.includes(file.type as WanderPhotoType)) {
    throw new Error('Choose a JPEG, PNG, or WebP photo.');
  }
  if (file.size <= 0 || file.size > MAX_WANDER_PHOTO_BYTES) {
    throw new Error('Photo must be between 1 byte and 10 MiB.');
  }
  return file.type as WanderPhotoType;
}

export async function uploadWanderPhoto(
  file: File,
  resourceId: string,
  transport: WanderPhotoTransport,
  onProgress?: (uploadedBytes: number, totalBytes: number) => void,
): Promise<UploadedPhoto> {
  validateWanderPhoto(file);
  if (!resourceId || resourceId.length > 256 || !/^obj-[A-Za-z0-9-]+$/.test(resourceId)) {
    throw new Error('Invalid Wander object ID.');
  }
  const session = await transport.begin(file, resourceId);
  if (!session.sessionId || !Number.isSafeInteger(session.chunkSize) ||
      session.chunkSize < 1 || session.chunkSize > 512 * 1024) {
    throw new Error('Storage returned an invalid upload session.');
  }
  try {
    for (let offset = 0, index = 0; offset < file.size; offset += session.chunkSize, index++) {
      const bytes = new Uint8Array(await file.slice(offset, offset + session.chunkSize).arrayBuffer());
      await transport.uploadChunk(session.sessionId, index, bytes);
      onProgress?.(Math.min(offset + bytes.length, file.size), file.size);
    }
    const result = await transport.finish(session.sessionId);
    if (!result.objectId || result.objectId.length > 256) {
      throw new Error('Storage did not return a valid object reference.');
    }
    return result;
  } catch (error) {
    // Never treat a failed cancellation as proof that the remote object is gone.
    if (transport.cancel) {
      try { await transport.cancel(session.sessionId); } catch { /* backend reconciles */ }
    }
    throw error;
  }
}
