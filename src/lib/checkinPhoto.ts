/**
 * Public image links in check-ins. The existing ICP Object guest API only
 * accepts a 280-character note; encapsulate the optional image link there so
 * older canisters, authenticated Checkpoints, and guest Checkpoints all work.
 *
 * A remote image host can see visitors' IP addresses when its picture loads.
 * No image bytes, tokens or upload credentials are stored by AllTracks.
 */
const PHOTO_NOTE_PREFIX = 'alltracks:checkin-photo:v1:';
const MAX_PHOTO_URL_LENGTH = 220;
const MAX_GUEST_NOTE_CHARS = 280;
const MAX_GUEST_NOTE_BYTES = 1200;

export function normalizeCheckinPhotoUrl(value: string): string {
  const input = value.trim();
  if (!input) return '';
  if (input.length > MAX_PHOTO_URL_LENGTH) {
    throw new Error('Photo URL is too long (max 220 characters). Use a shorter direct image link.');
  }
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('Enter a complete public HTTPS image URL.');
  }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== 'https:' || !host || url.username || url.password ||
      /^(localhost|.*\.localhost|.*\.local|.*\.internal)$/.test(host) ||
      /^\d+(?:\.\d+){3}$/.test(host) || host.includes(':') || url.port) {
    throw new Error('Use a public HTTPS image URL without credentials, an IP address, or a custom port.');
  }
  if (url.href.length > MAX_PHOTO_URL_LENGTH) {
    throw new Error('Photo URL is too long (max 220 characters).');
  }
  return url.href;
}

export type CheckinPhotoNote = { note: string; photoUrl: string };

export function encodeObjectCheckinNote(note: string, photoUrl: string): string {
  const cleanNote = note.trim();
  const safeUrl = normalizeCheckinPhotoUrl(photoUrl);
  const stored = safeUrl
    ? PHOTO_NOTE_PREFIX + JSON.stringify({ note: cleanNote, photoUrl: safeUrl })
    : cleanNote;
  if ([...stored].length > MAX_GUEST_NOTE_CHARS ||
      new TextEncoder().encode(stored).length > MAX_GUEST_NOTE_BYTES) {
    throw new Error('Note and photo link together are too long for an ICP guest check-in. Shorten the note or link.');
  }
  return stored;
}

export function decodeObjectCheckinNote(stored: string): CheckinPhotoNote {
  if (!stored.startsWith(PHOTO_NOTE_PREFIX)) return { note: stored, photoUrl: '' };
  try {
    const value: unknown = JSON.parse(stored.slice(PHOTO_NOTE_PREFIX.length));
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { note: stored, photoUrl: '' };
    }
    const record = value as Record<string, unknown>;
    if (typeof record.note !== 'string' || typeof record.photoUrl !== 'string') {
      return { note: stored, photoUrl: '' };
    }
    try {
      return { note: record.note, photoUrl: normalizeCheckinPhotoUrl(record.photoUrl) };
    } catch {
      // Invalid URL can never be turned into an img src / external link.
      return { note: record.note, photoUrl: '' };
    }
  } catch {
    return { note: stored, photoUrl: '' };
  }
}
