/**
 * Read an already-published public photo from ICEStorage.
 *
 * This intentionally requires a ResourceKey supplied by a trusted resource
 * binding. An upload objectId alone does not establish public readability.
 */
export type PhotoResourceKey = {
  resourceId: string;
  storage: {
    storageId: string;
    owner: { principal: import('@dfinity/principal').Principal } | {
      group: { id: string; namespace: string };
    };
  };
};

export type PublicPhotoChunk = {
  chunkCount: bigint;
  chunkNum: bigint;
  data: Uint8Array | number[];
  mimeType: string;
  objectId: string;
  objectSize: bigint;
};

export type PublicPhotoReadResult =
  | { ok: PublicPhotoChunk }
  | { err: { [key: string]: unknown } };

export interface PublicPhotoReader {
  readPublicPhotoChunk(
    key: PhotoResourceKey,
    objectId: string,
    chunkNum: bigint,
  ): Promise<PublicPhotoReadResult>;
}

const MAX_BYTES = 10_485_760;
const MAX_CHUNKS = 21;
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * The caller must revoke the returned object URL after the image is removed.
 * No anonymous access bypass: ICEStorage enforces public resource policy.
 */
export async function readPublishedWanderPhoto(
  reader: PublicPhotoReader,
  key: PhotoResourceKey,
  objectId: string,
): Promise<Blob> {
  if (!objectId || objectId.length > 256 || !key.resourceId || !key.storage.storageId) {
    throw new Error('Missing published photo resource binding.');
  }
  const chunks: Uint8Array[] = [];
  let expectedCount = 0;
  let expectedSize = 0;
  let mimeType = '';
  let received = 0;
  let expectedHash: string | null = null;
  for (let i = 1; i <= (expectedCount || 1); i++) {
    const result = await reader.readPublicPhotoChunk(key, objectId, BigInt(i));
    if ('err' in result) {
      throw new Error(`Public photo access denied: ${JSON.stringify(result.err)}`);
    }
    const chunk = result.ok;
    const count = Number(chunk.chunkCount);
    const size = Number(chunk.objectSize);
    if (!Number.isSafeInteger(count) || count < 1 || count > MAX_CHUNKS ||
        !Number.isSafeInteger(size) || size < 1 || size > MAX_BYTES ||
        !TYPES.has(chunk.mimeType) || chunk.objectId !== objectId ||
        chunk.chunkNum !== BigInt(i)) {
      throw new Error('Invalid public photo metadata.');
    }
    if (i === 1) {
      expectedCount = count;
      expectedSize = size;
      mimeType = chunk.mimeType;
    } else if (count !== expectedCount || size !== expectedSize || chunk.mimeType !== mimeType) {
      throw new Error('Inconsistent public photo chunks.');
    }
    const bytes = Uint8Array.from(chunk.data);
    if (bytes.length === 0 || bytes.length > 512_000 || received + bytes.length > expectedSize) {
      throw new Error('Invalid public photo chunk length.');
    }
    chunks.push(bytes);
    received += bytes.length;
  }
  if (received !== expectedSize) throw new Error('Incomplete public photo.');
  return new Blob(chunks, { type: mimeType });
}
