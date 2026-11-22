import type { Principal } from '@dfinity/principal';
import type { PhotoResourceKey } from './iceStoragePublicPhoto';

/**
 * A published photo is a verified backend association, not a raw upload ID.
 * A binding is only trustworthy when returned by the authenticated Alltracks
 * backend after it has checked ICEStorage's ResourceManifest.
 */
export type PublishedWanderPhoto = {
  objectId: string;
  storageObjectId: string;
  resourceKey: PhotoResourceKey;
  publisher: Principal;
  publishedAt: bigint;
};

const WANDER_ID = /^obj-[a-z0-9-]{12,65}$/;

/**
 * Defensive browser validation only. This does NOT authorize publication;
 * the backend must enforce ownership, resource visibility and object linkage.
 */
export function validatePublishedWanderPhoto(
  photo: PublishedWanderPhoto,
  expectedObjectId: string,
): PhotoResourceKey {
  if (!WANDER_ID.test(expectedObjectId) ||
      photo.objectId !== expectedObjectId ||
      !photo.storageObjectId ||
      photo.storageObjectId.length > 256 ||
      photo.resourceKey.resourceId !== expectedObjectId ||
      !photo.resourceKey.storage.storageId ||
      !photo.publisher ||
      photo.publishedAt <= 0n) {
    throw new Error('Invalid published Wander photo binding.');
  }
  return photo.resourceKey;
}
