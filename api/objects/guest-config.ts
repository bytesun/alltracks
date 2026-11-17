import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { isGuestGatewayConfigured } from './_lib/guest-security';

// Relay Principal is public; the private key MUST remain in the server-only
// GUEST_CHECKIN_IDENTITY_JSON environment variable.
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  if (!isGuestGatewayConfigured(process.env)) {
    return res.status(200).json({ enabled: false, siteKey: null, gatewayPrincipal: null });
  }
  try {
    const principal = Ed25519KeyIdentity.fromJSON(
      process.env.GUEST_CHECKIN_IDENTITY_JSON!,
    ).getPrincipal().toText();
    return res.status(200).json({
      enabled: true,
      siteKey: process.env.VITE_TURNSTILE_SITE_KEY,
      gatewayPrincipal: principal,
    });
  } catch {
    // Invalid or missing private identity material must fail closed.
    return res.status(200).json({ enabled: false, siteKey: null, gatewayPrincipal: null });
  }
}
