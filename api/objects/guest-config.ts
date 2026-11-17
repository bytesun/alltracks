import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isGuestGatewayConfigured } from './_lib/guest-security';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  const enabled = isGuestGatewayConfigured(process.env);
  return res.status(200).json({
    enabled,
    siteKey: enabled ? process.env.VITE_TURNSTILE_SITE_KEY : null,
  });
}
