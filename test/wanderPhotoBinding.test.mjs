import test from 'node:test';
import assert from 'node:assert/strict';
import { Principal } from '@dfinity/principal';
import { validatePublishedWanderPhoto } from '../src/lib/wanderPhotoBinding.ts';

const objectId = 'obj-123e4567-e89b-12d3-a456-426614174000';
const owner = Principal.fromText('2vxsx-fae');
const makeBinding = () => ({
  objectId,
  storageObjectId: 'storage-photo-123',
  resourceKey: {
    resourceId: objectId,
    storage: { storageId: 'wander-photos', owner: { principal: owner } },
  },
  publisher: owner,
  publishedAt: 1n,
});

test('accepts a correctly linked published photo binding', () => {
  const binding = makeBinding();
  assert.equal(validatePublishedWanderPhoto(binding, objectId), binding.resourceKey);
});

test('rejects resource substitution and mismatched Wander IDs', () => {
  assert.throws(() => validatePublishedWanderPhoto(makeBinding(), 'obj-00000000-0000-0000-0000-000000000000'), /Invalid/);
  const wrong = makeBinding();
  wrong.resourceKey.resourceId = 'obj-00000000-0000-0000-0000-000000000000';
  assert.throws(() => validatePublishedWanderPhoto(wrong, objectId), /Invalid/);
});

test('rejects empty storage object ID and missing publication timestamp', () => {
  const empty = makeBinding();
  empty.storageObjectId = '';
  assert.throws(() => validatePublishedWanderPhoto(empty, objectId), /Invalid/);
  const unpublished = makeBinding();
  unpublished.publishedAt = 0n;
  assert.throws(() => validatePublishedWanderPhoto(unpublished, objectId), /Invalid/);
});
