import type { VercelRequest, VercelResponse } from '@vercel/node';

// Proxy/feed endpoint to avoid CORS from the browser. Returns the raw JSON
// from the Farcaster gateway. Usage: GET /api/farcaster/feed?q=your+query

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const q = (req.query.q || req.query.query || '') as string;
  try {
    const base = 'https://api.farcaster.xyz/v2/casts';
    const url = q ? `${base}?query=${encodeURIComponent(q)}&limit=20` : `${base}?limit=20`;
    const r = await fetch(url);
    if (!r.ok) {
      return res.status(r.status).json({ error: `Upstream returned ${r.status}` });
    }
    const data = await r.json();
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('feed proxy error', err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
