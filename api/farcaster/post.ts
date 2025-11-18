import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';

// POST /api/farcaster/post
// body: { text }
// This stub checks for a session cookie (JWT) and returns a placeholder response.
// To actually publish to Farcaster you need to integrate with a relay and signing.

const COOKIE_NAME = 'farcaster_token';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const text = req.body?.text;
    if (!text) return res.status(400).json({ error: 'Missing text' });

    const secret = process.env.FARCASTER_JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server not configured for posting' });

    // Read cookie
    const cookie = req.headers.cookie || '';
    const match = cookie.split(';').map(c => c.trim()).find(c => c.startsWith(COOKIE_NAME + '='));
    if (!match) return res.status(401).json({ error: 'Not authenticated' });
    const token = match.split('=')[1];
    let payload: any;
    try {
      payload = jwt.verify(token, secret as string);
    } catch (err: any) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // TODO: Relay to Farcaster using server-side credentials or signer.
    console.log('Received post from', payload.address, 'text:', text);

    return res.status(200).json({ ok: true, message: 'Post received (relay not implemented)' });
  } catch (err: any) {
    console.error('post error', err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
