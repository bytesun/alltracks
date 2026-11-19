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

import { buildJourneyTimeline } from '../src/lib/journeyTimeline.ts';

const published = (id, at, extra = {}) => ({
  id, author: 'alice', createdAt: new Date(at).toISOString(), ...extra,
});
const pending = (id, at, extra = {}) => ({
  ...object, id, createdAt: at, principal: 'alice', attempts: 0, lastError: '', ...extra,
});
test('journey timeline interleaves public and local records newest first', () => {
  const rows = buildJourneyTimeline([published('a', 100), published('b', 300)], [pending('c', 200)], object.objectId, 'alice');
  assert.deepEqual(rows.map(row => [row.kind, row.item.id]), [['published','b'], ['local','c'], ['published','a']]);
});
test('journey timeline hides another account or object but includes local guest entries', () => {
  const items = [pending('other-account', 100, { principal: 'bob' }), pending('other-object', 200, { objectId: 'other' }), pending('guest', 300, { principal: null }), pending('mine', 400)];
  assert.deepEqual(buildJourneyTimeline([], items, object.objectId, 'alice').map(row => row.item.id), ['mine','guest']);
  assert.deepEqual(buildJourneyTimeline([], items, object.objectId, null).map(row => row.item.id), ['guest']);
});
test('signed-in request IDs suppress duplicate local rows only for the same author', () => {
  const items = [pending('uuid', 100)];
  assert.equal(buildJourneyTimeline([published('remote', 200, { requestId: 'uuid' })], items, object.objectId, 'alice').length, 1);
  assert.equal(buildJourneyTimeline([published('remote', 200, { requestId: 'uuid', author: 'bob' })], items, object.objectId, 'alice').length, 2);
  assert.equal(buildJourneyTimeline([published('remote', 200)], [], object.objectId, 'alice')[0].kind, 'published');
});

import { bindDeferredCheckin, isDeferredLoginCheckin, isGuestGatewayCheckin } from '../src/lib/offlineCheckins.ts';

test('explicit deferred-login stop binds once, preserving request ID and timestamp', () => {
  const draft = pending('stable-id', 1234, { principal: null, claimOnLogin: true });
  assert.equal(isDeferredLoginCheckin(draft), true);
  assert.equal(isGuestGatewayCheckin(draft), false);
  const bound = bindDeferredCheckin(draft, 'alice');
  assert.equal(bound.principal, 'alice');
  assert.equal(bound.id, draft.id);
  assert.equal(bound.createdAt, draft.createdAt);
  assert.equal(isDeferredLoginCheckin(bound), false);
  assert.equal(bindDeferredCheckin(bound, 'bob'), bound);
});
test('legacy and explicit anonymous gateway stops are never claimed by login', () => {
  for (const item of [pending('legacy', 1, { principal: null }), pending('guest', 1, { principal: null, claimOnLogin: false })]) {
    assert.equal(isGuestGatewayCheckin(item), true);
    assert.equal(bindDeferredCheckin(item, 'alice'), item);
  }
  const alreadyBound = pending('owned', 1, { principal: 'bob', claimOnLogin: true });
  assert.equal(bindDeferredCheckin(alreadyBound, 'alice'), alreadyBound);
});
