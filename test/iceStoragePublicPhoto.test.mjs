import test from 'node:test';
import assert from 'node:assert/strict';
import { readPublishedWanderPhoto } from '../src/lib/iceStoragePublicPhoto.ts';

const key = { resourceId: 'obj-abcdefghijkl', storage: { storageId: 'photos', owner: {} } };
const chunk = (i, data, count = 2, size = 5) => ({
  ok: { objectId: 'photo-1', chunkNum: BigInt(i), chunkCount: BigInt(count),
    objectSize: BigInt(size), mimeType: 'image/png', data: Uint8Array.from(data) },
});

test('reconstructs published photo from one-based chunks', async () => {
  const indices = [];
  const blob = await readPublishedWanderPhoto({
    async readPublicPhotoChunk(_key, _id, index) {
      indices.push(index);
      return index === 1n ? chunk(1, [1, 2, 3]) : chunk(2, [4, 5]);
    },
  }, key, 'photo-1');
  assert.deepEqual(indices, [1n, 2n]);
  assert.deepEqual([...new Uint8Array(await blob.arrayBuffer())], [1, 2, 3, 4, 5]);
  assert.equal(blob.type, 'image/png');
});

test('rejects access denial and partial data', async () => {
  await assert.rejects(readPublishedWanderPhoto({
    async readPublicPhotoChunk() { return { err: { forbidden: null } }; },
  }, key, 'photo-1'), /denied/);
  await assert.rejects(readPublishedWanderPhoto({
    async readPublicPhotoChunk(_key, _id, index) {
      return index === 1n ? chunk(1, [1, 2, 3]) : chunk(2, [4]);
    },
  }, key, 'photo-1'), /Incomplete/);
});

test('rejects oversized or inconsistent photo metadata', async () => {
  await assert.rejects(readPublishedWanderPhoto({
    async readPublicPhotoChunk() { return chunk(1, [1], 22, 1); },
  }, key, 'photo-1'), /Invalid public photo metadata/);
});
