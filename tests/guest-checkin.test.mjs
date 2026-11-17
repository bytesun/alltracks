import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GuestRequestError,
  isGuestObjectId,
  parseGuestRequest,
  verifyGuestTurnstile,
  isGuestGatewayConfigured,
  originAllowed,
} from '../api/objects/_lib/guest-security.ts';

const id = 'obj-12345678-1234-4123-8123-1234567890ab';
const requestId = '22345678-1234-4123-8123-1234567890ab';
const valid = Object.freeze({
  latitude: 49.1777777,
  longitude: -122.6333333,
  accuracyMeters: 17.6,
  action: 'found',
  note: '☕ Nice spot!',
  requestId,
  turnstileToken: 'test-token',
});

test('accepts valid object UUID and rejects arbitrary IDs', () => {
  assert.equal(isGuestObjectId(id), true);
  for (const bad of ['cup-7h9m4k', '/../../secret', 'obj-1', '', null]) {
    assert.equal(isGuestObjectId(bad), false);
  }
});
test('rounds GPS on server and trims notes', () => {
  const result = parseGuestRequest({ ...valid, note: ' hi ' }, id);
  assert.equal(result.latitude, 49.178);
  assert.equal(result.longitude, -122.633);
  assert.equal(result.accuracyMeters, 18);
  assert.equal(result.note, 'hi');
  assert.equal(result.objectId, id);
});
test('rejects forged values, replay IDs, oversized notes and invalid actions', () => {
  const bads = [
    { latitude: 91 },
    { longitude: -181 },
    { latitude: NaN },
    { longitude: Infinity },
    { accuracyMeters: -1 },
    { accuracyMeters: 2001 },
    { action: 'admin' },
    { requestId: 'duplicate' },
    { note: 'a'.repeat(281) },
    { note: '☕'.repeat(280) },
    { turnstileToken: '' },
    { turnstileToken: 'x'.repeat(2049) },
  ];
  for (const bad of bads) {
    assert.throws(() => parseGuestRequest({ ...valid, ...bad }, id), GuestRequestError, JSON.stringify(bad));
  }
  assert.throws(() => parseGuestRequest(valid, 'obj-1'), GuestRequestError);
  assert.throws(() => parseGuestRequest([], id), GuestRequestError);
});
test('requires strict same-origin match including protocol and port', () => {
  assert.equal(originAllowed('https://alltracks.icevent.app', 'https://alltracks.icevent.app'), true);
  assert.equal(originAllowed('https://alltracks.icevent.app.evil.com', 'https://alltracks.icevent.app'), false);
  assert.equal(originAllowed('http://alltracks.icevent.app', 'https://alltracks.icevent.app'), false);
  assert.equal(originAllowed(undefined, 'https://alltracks.icevent.app'), false);
});
const goodEnv = {
  GUEST_CHECKINS_ENABLED: 'true',
  GUEST_CHECKIN_WAF_READY: 'true',
  TURNSTILE_SECRET_KEY: 'secret',
  VITE_TURNSTILE_SITE_KEY: 'sitekey',
  GUEST_CHECKIN_IDENTITY_JSON: 'signed-service-identity',
  GUEST_CHECKIN_CANISTER_ID: 'r6cnt-kyaaa-aaaal-aab3a-cai',
  GUEST_ALLOWED_ORIGIN: 'https://alltracks.icevent.app',
};
test('guest gateway fails closed when anything is missing', () => {
  assert.equal(isGuestGatewayConfigured(goodEnv), true);
  for (const key of Object.keys(goodEnv)) {
    assert.equal(isGuestGatewayConfigured({ ...goodEnv, [key]: '' }), false, key);
  }
  assert.equal(isGuestGatewayConfigured({ ...goodEnv, GUEST_CHECKIN_CANISTER_ID: 'other' }), false);
});
const fakeFetch = (payload, status = 200) => async (url, opts) => {
  assert.equal(url, 'https://challenges.cloudflare.com/turnstile/v0/siteverify');
  assert.equal(opts.method, 'POST');
  assert.equal(new URLSearchParams(opts.body).get('secret'), 'secret');
  return new Response(JSON.stringify(payload), { status });
};
test('turnstile accepts success with expected host and action only', async () => {
  const data = { success: true, hostname: 'alltracks.icevent.app', action: 'object_checkin' };
  assert.equal(await verifyGuestTurnstile('token', 'secret', 'alltracks.icevent.app', fakeFetch(data)), true);
  assert.equal(await verifyGuestTurnstile('token', 'secret', 'other.example', fakeFetch(data)), false);
  assert.equal(await verifyGuestTurnstile('token', 'secret', 'alltracks.icevent.app', fakeFetch({ ...data, action: 'login' })), false);
  assert.equal(await verifyGuestTurnstile('token', 'secret', 'alltracks.icevent.app', fakeFetch({ ...data, success: false })), false);
  assert.equal(await verifyGuestTurnstile('token', 'secret', 'alltracks.icevent.app', fakeFetch(data, 500)), false);
  assert.equal(await verifyGuestTurnstile('token', 'secret', 'alltracks.icevent.app', async () => { throw Error('offline'); }), false);
});
