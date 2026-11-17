import test from 'node:test';
import assert from 'node:assert/strict';
import { objectLabelSubtitle, printLabelQrUrl } from '../src/lib/printLabel.ts';

const objectUrl = 'https://alltracks.icevent.app/object/obj-12345678-1234-4123-8123-1234567890ab';
const spotUrl = 'https://alltracks.icevent.app/check-in/42';

test('Object label QR contains the actual public Object page', () => {
  const qr = new URL(printLabelQrUrl(objectUrl));
  assert.equal(qr.hostname, 'api.qrserver.com');
  assert.equal(qr.searchParams.get('data'), objectUrl);
  assert.equal(qr.searchParams.get('size'), '900x900');
});
test('Trail sign QR contains the actual Spot check-in page', () => {
  const qr = new URL(printLabelQrUrl(spotUrl));
  assert.equal(qr.searchParams.get('data'), spotUrl);
});
test('QR never encodes query parameters, credentials or unrelated routes', () => {
  for (const address of [
    'javascript:alert(1)',
    'http://alltracks.icevent.app/check-in/2',
    'https://alltracks.icevent.app/check-in/2?private=hello',
    'https://alltracks.icevent.app/check-in/2#other',
    'https://alice:secret@alltracks.icevent.app/check-in/2',
    'https://alltracks.icevent.app/check-in/abc',
    'https://alltracks.icevent.app/object/obj-invalid',
    'https://alltracks.icevent.app/other',
  ]) {
    assert.throws(() => printLabelQrUrl(address), Error, address);
  }
});
test('Object subtitle retains article and sounds natural', () => {
  assert.equal(objectLabelSubtitle('My Wandering Cup'), 'I AM A WANDERING CUP');
  assert.equal(objectLabelSubtitle('An orange cup'), 'I AM AN ORANGE CUP');
  assert.equal(objectLabelSubtitle('Apple'), 'I AM AN APPLE');
  assert.equal(objectLabelSubtitle('Book'), 'I AM A BOOK');
  assert.equal(objectLabelSubtitle(' '), 'I AM ON A JOURNEY');
});
