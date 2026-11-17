import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  GuestRequestError,
  isGuestGatewayConfigured,
  originAllowed,
  parseGuestRequest,
  verifyGuestTurnstile,
} from '../_lib/guest-security';
import { writeGuestCheckinToExistingCanister } from '../_lib/guest-icp';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  // Fail closed in all previews and production until the EXISTING ICP canister
  // is upgraded with submitGuestCheckin + gateway caller ACL + owner policy.
  // A frontend-only change MUST NOT enable anonymous writes.
  if (!isGuestGatewayConfigured(process.env)) {
    return res.status(503).json({ error: 'Guest check-ins are not available yet.' });
  }
  if (!originAllowed(req.headers.origin, process.env.GUEST_ALLOWED_ORIGIN!)) {
    return res.status(403).json({ error: 'Origin not permitted.' });
  }
  if (!String(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
    return res.status(415).json({ error: 'JSON required.' });
  }
  const declaredLength = Number(req.headers['content-length'] ?? 0);
  if (!Number.isSafeInteger(declaredLength) || declaredLength > 4096 || declaredLength < 0) {
    return res.status(413).json({ error: 'Request too large.' });
  }

  try {
    const raw = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (raw === undefined || raw === null || Buffer.byteLength(JSON.stringify(raw), 'utf8') > 4096) {
      return res.status(413).json({ error: 'Request too large.' });
    }
    const pathId = Array.isArray(req.query.id) ? null : req.query.id;
    const received = parseGuestRequest(raw, pathId);
    const expectedHostname = new URL(process.env.GUEST_ALLOWED_ORIGIN!).hostname;
    const human = await verifyGuestTurnstile(
      received.turnstileToken,
      process.env.TURNSTILE_SECRET_KEY!,
      expectedHostname,
    );
    if (!human) return res.status(403).json({ error: 'Human verification failed or expired.' });

    // Turnstile is not a substitute for rate limiting. WAF must be enabled,
    // and the canister must enforce request ID deduplication and quotas.
    const { turnstileToken: _token, ...input } = received;
    const result = await writeGuestCheckinToExistingCanister(
      input,
      process.env.GUEST_CHECKIN_IDENTITY_JSON!,
      process.env.GUEST_CHECKIN_CANISTER_ID!,
    );
    if ('ok' in result) {
      return res.status(201).json({ ok: true, checkinId: result.ok.toString() });
    }
    const type = Object.keys(result.err)[0];
    const code = type === 'rateLimited' ? 429 :
      type === 'duplicate' ? 409 :
      type === 'notFound' ? 404 :
      type === 'disabled' ? 403 :
      type === 'unauthorized' ? 503 : 400;
    return res.status(code).json({ error: type === 'unauthorized' ? 'Service unavailable.' : type });
  } catch (e) {
    if (e instanceof GuestRequestError) return res.status(e.status).json({ error: e.message });
    // Do not leak canister errors or signing key contents.
    console.error('Guest check-in request failed', e instanceof Error ? e.name : 'unknown');
    return res.status(502).json({ error: 'Check-in could not be saved. Retry later.' });
  }
}
