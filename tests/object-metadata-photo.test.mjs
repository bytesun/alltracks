import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OBJECT_METADATA_PREFIX,
  encodeObjectMetadata,
  decodeObjectMetadata,
} from '../src/lib/objectMetadata.ts';

test('Object creation encodes its optional HTTPS photo URL in existing v1 Track metadata', () => {
  const photoUrl = 'https://images.example.com/cup.jpg';
  const value = encodeObjectMetadata('A cup with 14 years of history', '☕', photoUrl);
  assert.ok(value.startsWith('alltracks:object:v1:'));
  assert.deepEqual(decodeObjectMetadata(value), {
    description: 'A cup with 14 years of history',
    emoji: '☕',
    photoUrl,
  });
});
test('legacy Objects with no photo are unchanged and remain readable', () => {
  const legacy = OBJECT_METADATA_PREFIX + JSON.stringify({
    description: 'Old object',
    emoji: '📦',
  });
  assert.deepEqual(decodeObjectMetadata(legacy), {
    description: 'Old object', emoji: '📦', photoUrl: '',
  });
  const createdWithoutPhoto = encodeObjectMetadata('New object', '📦');
  assert.equal(decodeObjectMetadata(createdWithoutPhoto).photoUrl, '');
});
test('malicious or broken stored photo metadata cannot hide an otherwise valid Object', () => {
  const unsafe = OBJECT_METADATA_PREFIX + JSON.stringify({
    description: 'A real object',
    emoji: '☕',
    photoUrl: 'javascript:alert(1)',
  });
  assert.deepEqual(decodeObjectMetadata(unsafe), {
    description: 'A real object', emoji: '☕', photoUrl: '',
  });
  assert.equal(decodeObjectMetadata(OBJECT_METADATA_PREFIX + 'garbage'), null);
  assert.equal(decodeObjectMetadata('unrelated'), null);
});
test('invalid creation photo links are rejected before making a backend call', () => {
  for (const photo of [
    'http://images.example.com/cup.jpg',
    'javascript:alert(1)',
    'https://localhost/photo.png',
    'https://127.0.0.1/photo.png',
    'https://example.com:8443/cup.jpg',
    'https://user:password@example.com/cup.jpg',
    'https://example.com/' + 'a'.repeat(230),
  ]) {
    assert.throws(() => encodeObjectMetadata('Cup', '☕', photo), Error, photo);
  }
});
