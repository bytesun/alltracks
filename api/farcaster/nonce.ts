import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const nonce = crypto.randomBytes(16).toString('hex');
    return res.status(200).json({ nonce });
  } catch (err: any) {
    console.error('nonce error', err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
