import type { Principal } from '@dfinity/principal';
import type { PublicPhotoReader } from './iceStoragePublicPhoto';
import { readPublishedWanderPhoto } from './iceStoragePublicPhoto';

/** The Alltracks backend returns this only for durable, published bindings. */
export interface PublishedWanderPhotoBinding {
  objectId: string;
  storageObjectId: string;
  storageOwner: Principal;
  storageId: string;
  resourceId: string;
}

export interface WanderPublishedPhotoBackend {
  listPublishedWanderObjectPhotos(objectId: string): Promise<PublishedWanderPhotoBinding[]>;
}

/**
 * Resolve through Alltracks first, then let ICEStorage enforce its public
 * resource policy on every chunk. No arbitrary client-supplied ResourceKey.
 * The caller owns the returned Blob and any object URL it creates.
 */
export async function loadPublishedWanderObjectPhotos(
  backend: WanderPublishedPhotoBackend,
  storage: PublicPhotoReader,
  wanderObjectId: string,
): Promise<Array<{ storageObjectId: string; blob: Blob }>> {
  if (!/^obj-[a-z0-9-]{12,65}$/.test(wanderObjectId)) {
    throw new Error('Invalid Wander object ID.');
  }
  const bindings = await backend.listPublishedWanderObjectPhotos(wanderObjectId);
  const photos: Array<{ storageObjectId: string; blob: Blob }> = [];
  for (const binding of bindings) {
    if (binding.objectId !== wanderObjectId ||
        !binding.storageObjectId || binding.storageObjectId.length > 256 ||
        binding.storageId !== 'project-wander-photo' ||
        binding.resourceId !== binding.storageObjectId) {
      throw new Error('Invalid published photo binding.');
    }
    const blob = await readPublishedWanderPhoto(
      storage,
      {
        resourceId: binding.resourceId,
        storage: {
          storageId: binding.storageId,
          owner: { principal: binding.storageOwner },
        },
      },
      binding.storageObjectId,
    );
    photos.push({ storageObjectId: binding.storageObjectId, blob });
  }
  return photos;
}
