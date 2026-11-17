import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeQueuedObject, normalizeQueuedSpot } from '../src/lib/offlineCheckins.ts';

const object = Object.freeze({
  kind: 'object',
  objectId: 'obj-11111111-1111-4111-8111-111111111111',
  principal: null,
  latitude: 49.17458761,
  longitude: -122.65126789,
  accuracyMeters: 17.6,
  action: 'found',
  note: 'Found this cup on the trail',
  photoUrl: 'https://example.com/cup.jpg',
});
const spot = Object.freeze({
  kind: 'spot',
  spotId: '12',
  principal: 'owner-principal',
  name: 'Hiker',
  note: 'Cloudy morning',
  photoUrl: '',
});

test('object GPS is rounded BEFORE local persistence', () => {
  const queued = normalizeQueuedObject(object);
  assert.equal(queued.latitude, 49.175);
  assert.equal(queued.longitude, -122.651);
  assert.equal(queued.accuracyMeters, 18);
  assert.equal(queued.note, object.note);
  assert.equal(queued.photoUrl, object.photoUrl);
});
test('object rejects invalid GPS, IDs, actions and size-exceeded notes', () => {
  for (const invalid of [
    { objectId: 'obj-' + '-'.repeat(36) },
    { objectId: '../other' },
    { latitude: Infinity },
    { latitude: 91 },
    { longitude: -181 },
    { accuracyMeters: 2001 },
    { action: 'delete' },
    { note: 'X'.repeat(280), photoUrl: 'https://example.com/cup.jpg' },
    { photoUrl: 'http://example.com/cup.jpg' },
    { photoUrl: 'https://127.0.0.1/cup.jpg' },
  ]) {
    assert.throws(() => normalizeQueuedObject({ ...object, ...invalid }), Error, JSON.stringify(invalid));
  }
});
test('guest and signed-in object records share safe location precision', () => {
  const guest = normalizeQueuedObject(object);
  const signedIn = normalizeQueuedObject({ ...object, principal: 'test-principal' });
  assert.equal(guest.latitude, signedIn.latitude);
  assert.equal(guest.longitude, signedIn.longitude);
});
test('spot requires account and validates saved note/photo', () => {
  assert.deepEqual(normalizeQueuedSpot(spot), spot);
  assert.throws(() => normalizeQueuedSpot({ ...spot, principal: '' }), Error);
  assert.throws(() => normalizeQueuedSpot({ ...spot, note: 'x'.repeat(501) }), Error);
  assert.throws(() => normalizeQueuedSpot({ ...spot, name: 'x'.repeat(41) }), Error);
  assert.throws(() => normalizeQueuedSpot({ ...spot, photoUrl: 'javascript:alert(1)' }), Error);
});
