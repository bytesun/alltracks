import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCheckinPhotoUrl,
  encodeObjectCheckinNote,
  decodeObjectCheckinNote,
} from '../src/lib/checkinPhoto.ts';

test('accepts a public HTTPS image URL and preserves it', () => {
  assert.equal(normalizeCheckinPhotoUrl(' https://images.example.com/fishing/trail.jpg '),
    'https://images.example.com/fishing/trail.jpg');
});
test('rejects unsafe, non-public and overly long URLs', () => {
  for (const url of [
    'javascript:alert(1)',
    'data:image/svg+xml,<svg />',
    'http://example.com/a.jpg',
    '//example.com/a.jpg',
    'https://username:secret@example.com/image.png',
    'https://127.0.0.1/image.jpg',
    'https://localhost/photo.png',
    'https://files.internal/photo.jpg',
    'https://[::1]/photo.jpg',
    'https://example.com:8080/image.png',
    'https://example.com/' + 'x'.repeat(230),
  ]) {
    assert.throws(() => normalizeCheckinPhotoUrl(url), Error, url);
  }
});
test('encodes and decodes an optional image inside an existing guest note', () => {
  const source = 'https://images.example.com/my-cup.jpg';
  const stored = encodeObjectCheckinNote('Found it on the trail!', source);
  assert.ok(stored.startsWith('alltracks:checkin-photo:v1:'));
  assert.ok([...stored].length <= 280);
  assert.deepEqual(decodeObjectCheckinNote(stored), {
    note: 'Found it on the trail!',
    photoUrl: source,
  });
});
test('unmodified old notes still display normally', () => {
  assert.equal(encodeObjectCheckinNote('Original note', ''), 'Original note');
  assert.deepEqual(decodeObjectCheckinNote('Original note'), { note: 'Original note', photoUrl: '' });
});
test('does not trust an unsafe URL inside stored metadata', () => {
  const encoded = 'alltracks:checkin-photo:v1:' + JSON.stringify({
    note: 'Old note', photoUrl: 'javascript:alert(1)',
  });
  assert.deepEqual(decodeObjectCheckinNote(encoded), { note: 'Old note', photoUrl: '' });
});
test('enforces existing 280-character guest backend limit including photo', () => {
  assert.throws(() => encodeObjectCheckinNote('x'.repeat(280), 'https://images.example.com/a.jpg'), /too long/);
  assert.equal(encodeObjectCheckinNote('🌲'.repeat(280), '').length, 560);
  assert.throws(() => encodeObjectCheckinNote('x'.repeat(281), ''), /too long/);
});
