// Pure, testable validation for the anonymous check-in gateway.
// Do not store request IP, device fingerprints or exact GPS coordinates.
export type GuestAction = 'found' | 'carried' | 'left';
export type GuestInput = {
  objectId: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  action: GuestAction;
  note: string;
  requestId: string;
};
export type ReceivedGuestInput = GuestInput & { turnstileToken: string };

export class GuestRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
const objectIdPattern = /^obj-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const actions: GuestAction[] = ['found', 'carried', 'left'];

export const isGuestObjectId = (value: unknown): value is string =>
  typeof value === 'string' && objectIdPattern.test(value);

export function parseGuestRequest(raw: unknown, pathId: unknown): ReceivedGuestInput {
  if (!isGuestObjectId(pathId)) throw new GuestRequestError(400, 'Invalid object ID.');
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new GuestRequestError(400, 'Invalid request body.');
  }
  const p = raw as Record<string, unknown>;
  if (
    typeof p.latitude !== 'number' || typeof p.longitude !== 'number' ||
    !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude) ||
    p.latitude < -90 || p.latitude > 90 ||
    p.longitude < -180 || p.longitude > 180
  ) throw new GuestRequestError(400, 'Invalid GPS coordinates.');
  if (
    typeof p.accuracyMeters !== 'number' ||
    !Number.isFinite(p.accuracyMeters) ||
    p.accuracyMeters < 0 || p.accuracyMeters > 2000
  ) throw new GuestRequestError(400, 'Invalid GPS accuracy.');
  if (!actions.includes(p.action as GuestAction)) {
    throw new GuestRequestError(400, 'Unknown check-in action.');
  }
  if (typeof p.note !== 'string' || [...p.note].length > 280 ||
      Buffer.byteLength(p.note, 'utf8') > 1200) {
    throw new GuestRequestError(400, 'Note is too long.');
  }
  if (typeof p.requestId !== 'string' || !requestIdPattern.test(p.requestId)) {
    throw new GuestRequestError(400, 'Invalid request ID.');
  }
  if (typeof p.turnstileToken !== 'string' ||
      p.turnstileToken.length < 2 || p.turnstileToken.length > 2048) {
    throw new GuestRequestError(400, 'Complete human verification.');
  }
  return {
    objectId: pathId,
    // Intentional second rounding on server. The caller should also round before transmission.
    latitude: Number(p.latitude.toFixed(3)),
    longitude: Number(p.longitude.toFixed(3)),
    accuracyMeters: Math.round(p.accuracyMeters),
    action: p.action as GuestAction,
    note: p.note.trim(),
    requestId: p.requestId,
    turnstileToken: p.turnstileToken,
  };
}

export interface TurnstileResponse {
  success: boolean;
  hostname?: string;
  action?: string;
  'error-codes'?: string[];
}

export async function verifyGuestTurnstile(
  token: string,
  secret: string,
  expectedHostname: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  if (!token || !secret || !expectedHostname) return false;
  const body = new URLSearchParams({ secret, response: token });
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 5000);
  try {
    const result = await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    });
    if (!result.ok) return false;
    const json = await result.json() as TurnstileResponse;
    return json.success === true &&
      json.hostname === expectedHostname &&
      json.action === 'object_checkin';
  } catch {
    return false; // Fail closed during verifier outages.
  } finally {
    clearTimeout(deadline);
  }
}

export function isGuestGatewayConfigured(env: NodeJS.ProcessEnv): boolean {
  return env.GUEST_CHECKINS_ENABLED === 'true' &&
    env.GUEST_CHECKIN_WAF_READY === 'true' &&
    Boolean(env.TURNSTILE_SECRET_KEY) &&
    Boolean(env.VITE_TURNSTILE_SITE_KEY) &&
    Boolean(env.GUEST_CHECKIN_IDENTITY_JSON) &&
    env.GUEST_CHECKIN_CANISTER_ID === 'r6cnt-kyaaa-aaaal-aab3a-cai' &&
    Boolean(env.GUEST_ALLOWED_ORIGIN);
}

export function originAllowed(origin: unknown, expectedOrigin: string): boolean {
  if (typeof origin !== 'string') return false;
  try {
    return new URL(origin).origin === new URL(expectedOrigin).origin;
  } catch {
    return false;
  }
}
