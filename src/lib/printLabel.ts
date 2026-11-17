/** Deterministic QR image link for public AllTracks Object / Spot pages.
 * Never encode user identity, precise GPS or any credential in printed labels.
 */
export function printLabelQrUrl(publicUrl: string): string {
  const parsed = new URL(publicUrl);
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && parsed.hostname === 'localhost')) {
    throw new Error('A public HTTPS check-in URL is required.');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('Printable QR links cannot contain credentials or query parameters.');
  }
  const validObject = /^\/object\/obj-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parsed.pathname);
  const validSpot = /^\/check-in\/[0-9]+$/.test(parsed.pathname);
  if (!validObject && !validSpot) {
    throw new Error('This is not a valid AllTracks Object or Spot check-in link.');
  }
  return 'https://api.qrserver.com/v1/create-qr-code/?size=900x900&margin=18&data=' +
    encodeURIComponent(parsed.origin + parsed.pathname);
}

export function objectLabelSubtitle(objectName: string): string {
  const name = objectName.trim().replace(/^(my|the|this)\s+/i, '').toUpperCase().slice(0, 34);
  if (!name) return 'I AM ON A JOURNEY';
  if (/^(A|AN)\s/.test(name)) return 'I AM ' + name;
  if (/^[AEIOU]/.test(name)) return 'I AM AN ' + name;
  return 'I AM A ' + name;
}
