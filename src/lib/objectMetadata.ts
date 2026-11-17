import { normalizeCheckinPhotoUrl } from './checkinPhoto.ts';

/**
 * Extend the existing Track.description JSON metadata without changing its
 * version or requiring a backend/Candid migration.
 * Pre-photo Object tracks remain fully readable.
 */
export const OBJECT_METADATA_PREFIX = 'alltracks:object:v1:';

export type ObjectMetadata = {
  description: string;
  emoji: string;
  photoUrl: string;
};

export function encodeObjectMetadata(description: string, emoji: string, photoUrl = ''): string {
  const value: ObjectMetadata = {
    description: description.trim().slice(0, 500),
    emoji: emoji.trim().slice(0, 4) || '📦',
    photoUrl: normalizeCheckinPhotoUrl(photoUrl),
  };
  // Keep the unchanged v1 metadata namespace for existing AllTracks canisters.
  return OBJECT_METADATA_PREFIX + JSON.stringify(value);
}

export function decodeObjectMetadata(value: string): ObjectMetadata | null {
  if (!value.startsWith(OBJECT_METADATA_PREFIX)) return null;
  try {
    const parsed: unknown = JSON.parse(value.slice(OBJECT_METADATA_PREFIX.length));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const meta = parsed as Record<string, unknown>;
    if (typeof meta.description !== 'string') return null;
    // A corrupt or legacy photo field must never hide a valid old Object.
    let photoUrl = '';
    if (typeof meta.photoUrl === 'string') {
      try { photoUrl = normalizeCheckinPhotoUrl(meta.photoUrl); }
      catch { /* Suppress invalid image URLs stored by older clients. */ }
    }
    return {
      description: meta.description.slice(0, 500),
      emoji: typeof meta.emoji === 'string' ? meta.emoji.slice(0, 4) : '📦',
      photoUrl,
    };
  } catch {
    return null;
  }
}
