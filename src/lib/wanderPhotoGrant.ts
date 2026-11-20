import type { GrantProvider } from './iceStorageActorTransport';

/** The backend's new endpoint is deliberately feature-detected until deployed. */
export interface WanderGrantBackend {
  requestWanderPhotoUploadGrant?(
    objectId: string,
    mimeType: string,
    size: bigint,
  ): Promise<{ ok: string } | { err: string }>;
}

/**
 * Obtain a scoped grant through Alltracks Backend (never from ICEStorage
 * directly in the browser). The actor must use the current signed-in agent.
 *
 * No anonymous fallback: guest uploads require their own verified flow.
 */
export function createWanderGrantProvider(
  backend: WanderGrantBackend,
): GrantProvider {
  return async (file, objectId) => {
    if (typeof backend.requestWanderPhotoUploadGrant !== 'function') {
      throw new Error('Wander photo uploads are not enabled on this backend.');
    }
    const result = await backend.requestWanderPhotoUploadGrant(
      objectId,
      file.type,
      BigInt(file.size),
    );
    if ('err' in result) throw new Error(`Photo authorization denied: ${result.err}`);
    if (!result.ok) throw new Error('Photo authorization returned an empty grant.');
    return {
      grantId: result.ok,
      // Fresh idempotency key for this upload attempt; never reuse across files.
      clientRequestId: crypto.randomUUID(),
    };
  };
}
