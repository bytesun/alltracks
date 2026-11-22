import type { AuthorizedPhotoSession, UploadedPhoto, WanderPhotoTransport } from './iceStorageUpload';

/**
 * Minimal structural view of ICEStorage's Candid actor. Pass an actor built
 * with the currently authenticated user's identity, never an anonymous agent
 * or a privileged project/backend identity.
 */
type StorageError = { [key: string]: unknown };
type Result<T> = { ok: T } | { err: StorageError };
type StorageSession = {
  sessionId: string;
  objectId: string;
  chunkCount: bigint;
  status: { uploading: null } | { complete: null } | { aborted: null };
};
type UploadRequest = {
  clientRequestId: [] | [string];
  fileName: [] | [string];
  mimeType: string;
  sha256: [] | [Uint8Array];
  size: bigint;
};

export interface AuthorizedStorageActor {
  beginAuthorizedObjectUpload(grantId: string, request: UploadRequest): Promise<Result<StorageSession>>;
  uploadObjectChunk(sessionId: string, chunkNum: bigint, data: Uint8Array): Promise<Result<null>>;
  finalizeObjectUpload(sessionId: string): Promise<Result<StorageSession>>;
  abortObjectUpload(sessionId: string): Promise<Result<null>>;
}

export type GrantProvider = (
  file: File,
  resourceId: string,
) => Promise<{ grantId: string; clientRequestId: string }>;

/** ICEStorage's ObjectUploadPolicy currently permits chunks of 512,000 bytes. */
const CHUNK_BYTES = 512_000;

function unwrap<T>(result: Result<T>, operation: string): T {
  if ('err' in result) {
    throw new Error(`ICEStorage ${operation} failed: ${JSON.stringify(result.err)}`);
  }
  return result.ok;
}

/**
 * The grant provider MUST authenticate with Alltracks Backend, which alone
 * can issueProjectUploadGrant as the registered project Principal.
 * The browser actor MUST use the same user Principal named by that grant.
 */
export function createAuthorizedStorageTransport(
  actor: AuthorizedStorageActor,
  getGrant: GrantProvider,
): WanderPhotoTransport {
  const objectsBySession = new Map<string, string>();
  return {
    async begin(file, resourceId): Promise<AuthorizedPhotoSession> {
      const { grantId, clientRequestId } = await getGrant(file, resourceId);
      if (!grantId || !clientRequestId) throw new Error('Missing upload authorization.');
      const request: UploadRequest = {
        clientRequestId: [clientRequestId],
        fileName: [file.name.slice(0, 200)],
        mimeType: file.type,
        sha256: [],
        size: BigInt(file.size),
      };
      const session = unwrap(
        await actor.beginAuthorizedObjectUpload(grantId, request),
        'begin',
      );
      if (!('uploading' in session.status)) {
        throw new Error('ICEStorage did not return an active upload session.');
      }
      objectsBySession.set(session.sessionId, session.objectId);
      return {
        sessionId: session.sessionId,
        chunkSize: CHUNK_BYTES,
        chunkCount: Number(session.chunkCount),
      };
    },
    async uploadChunk(sessionId, index, bytes) {
      unwrap(await actor.uploadObjectChunk(sessionId, BigInt(index), bytes), 'chunk');
    },
    async finish(sessionId): Promise<UploadedPhoto> {
      // ICEStorage finalize is idempotent for completed sessions. Retry a
      // transport failure with the SAME session ID, never a fresh upload.
      let session: StorageSession | undefined;
      let lastError: unknown;
      for (let attempt = 0; attempt < 3 && !session; attempt++) {
        try {
          session = unwrap(await actor.finalizeObjectUpload(sessionId), 'finalize');
        } catch (error) {
          lastError = error;
        }
      }
      if (!session) {
        const objectId = objectsBySession.get(sessionId);
        const reason = lastError instanceof Error ? lastError.message : String(lastError ?? 'Unknown failure');
        throw new Error(`Finalize not confirmed: ${reason}. Storage Object ID: ${objectId ?? 'unknown'}. Do not upload again until reconciled.`);
      }
      if (!('complete' in session.status)) {
        throw new Error('ICEStorage upload is not complete.');
      }
      const expected = objectsBySession.get(sessionId);
      if (!expected || expected !== session.objectId) {
        throw new Error('ICEStorage returned a different object.');
      }
      objectsBySession.delete(sessionId);
      return { objectId: session.objectId };
    },
    // Do not automatically abort an uncertain finalize: the backend's
    // durable recovery mechanism must reconcile lost acknowledgements.
    // Explicit cancellation can be exposed separately once retry semantics
    // are implemented and tested.
  };
}
