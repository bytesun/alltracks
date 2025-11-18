import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { verifyMessage } from 'ethers';

// POST /api/farcaster/auth
// body: { address, message, signature }
// Verifies the signature and issues a JWT session cookie if FARCASTER_JWT_SECRET is set.

const COOKIE_NAME = 'farcaster_token';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { address, message, signature } = req.body || {};
    if (!address || !message || !signature) return res.status(400).json({ error: 'Missing fields' });
    // Verify signature
    let recovered: string;
    try {
      recovered = verifyMessage(message, signature);
    } catch (err: any) {
      console.error('signature verify failed', err);
      return res.status(400).json({ error: 'Invalid signature' });
    }
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return res.status(400).json({ error: 'Signature does not match address' });
    }

    const secret = process.env.FARCASTER_JWT_SECRET;
    if (!secret) {
      console.warn('FARCASTER_JWT_SECRET not set — returning ok without session');
      return res.status(200).json({ ok: true, address });
    }

    const token = jwt.sign({ address }, secret, { expiresIn: '7d' });
    // Set HttpOnly cookie
    const cookie = `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    res.setHeader('Set-Cookie', cookie);
    return res.status(200).json({ ok: true, address });
  } catch (err: any) {
    console.error('auth error', err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
