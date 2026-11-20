import test from 'node:test';
import assert from 'node:assert/strict';
import { uploadWanderPhoto } from '../src/lib/iceStorageUpload.ts';

function file(bytes, type = 'image/png') {
  return new File([new Uint8Array(bytes)], 'test.png', { type });
}

test('uploads chunks with ICEStorage one-based indexes and reports progress', async () => {
  const seen = [];
  const progress = [];
  const transport = {
    async begin() { return { sessionId: 'session-1', chunkSize: 3, chunkCount: 3 }; },
    async uploadChunk(_session, index, data) { seen.push([index, [...data]]); },
    async finish() { return { objectId: 'object-1' }; },
  };
  const result = await uploadWanderPhoto(file(7), 'obj-abc', transport, (n) => progress.push(n));
  assert.deepEqual(seen, [[1, [0, 0, 0]], [2, [0, 0, 0]], [3, [0]]]);
  assert.deepEqual(progress, [3, 6, 7]);
  assert.equal(result.objectId, 'object-1');
});

test('rejects mismatched server chunk count before writing', async () => {
  let writes = 0;
  const transport = {
    async begin() { return { sessionId: 's', chunkSize: 3, chunkCount: 1 }; },
    async uploadChunk() { writes++; },
    async finish() { throw new Error('unexpected'); },
  };
  await assert.rejects(uploadWanderPhoto(file(7), 'obj-abc', transport), /inconsistent chunk count/);
  assert.equal(writes, 0);
});

test('does not accept invalid file types or Wander IDs', async () => {
  const transport = { async begin() { throw new Error('should not begin'); } };
  await assert.rejects(uploadWanderPhoto(file(1, 'text/plain'), 'obj-abc', transport), /JPEG/);
  await assert.rejects(uploadWanderPhoto(file(1), 'bad-id', transport), /Invalid Wander/);
});

test('preserves upload failure even when cancellation fails', async () => {
  const transport = {
    async begin() { return { sessionId: 's', chunkSize: 3 }; },
    async uploadChunk() { throw new Error('network failure'); },
    async finish() { throw new Error('unexpected'); },
    async cancel() { throw new Error('cancellation unavailable'); },
  };
  await assert.rejects(uploadWanderPhoto(file(7), 'obj-abc', transport), /network failure/);
});
