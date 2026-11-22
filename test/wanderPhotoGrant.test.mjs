import test from 'node:test';
import assert from 'node:assert/strict';
import { createWanderGrantProvider } from '../src/lib/wanderPhotoGrant.ts';

const photo = new File([new Uint8Array(4)], 'sample.png', { type: 'image/png' });

test('requests grant with exact object, MIME and bigint size', async () => {
  const calls = [];
  const provider = createWanderGrantProvider({
    async requestWanderPhotoUploadGrant(...args) {
      calls.push(args);
      return { ok: 'grant-123' };
    },
  });
  const result = await provider(photo, 'obj-abc');
  assert.deepEqual(calls, [['obj-abc', 'image/png', 4n]]);
  assert.equal(result.grantId, 'grant-123');
  assert.match(result.clientRequestId, /^[a-f0-9-]{36}$/i);
});

test('fails closed when backend endpoint is absent', async () => {
  await assert.rejects(
    createWanderGrantProvider({})(photo, 'obj-abc'),
    /not enabled/,
  );
});

test('propagates authorization rejection without exposing fallback grant', async () => {
  const provider = createWanderGrantProvider({
    async requestWanderPhotoUploadGrant() { return { err: 'Only the object owner can upload' }; },
  });
  await assert.rejects(provider(photo, 'obj-abc'), /Only the object owner/);
});
