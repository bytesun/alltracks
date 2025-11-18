import type { VercelRequest, VercelResponse } from '@vercel/node';

// Proxy/feed endpoint to avoid CORS from the browser. Returns the raw JSON
// from the Farcaster gateway. Usage: GET /api/farcaster/feed?q=your+query

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const q = (req.query.q || req.query.query || '') as string;
  try {
    const base = 'https://api.farcaster.xyz/v2/casts';
    // The Farcaster `casts` endpoint requires filters (e.g. `fid`) when called
    // without a search query. Use fid=1 (official Farcaster account) as a
    // safe default so the proxy returns a useful feed instead of 400.
    const url = q ? `${base}?query=${encodeURIComponent(q)}&limit=20` : `${base}?fid=1&limit=20`;
    const r = await fetch(url);
    if (!r.ok) {
      // Try to surface the upstream response body for debugging (don't leak sensitive info in production)
      let bodyText = '';
      try { bodyText = await r.text(); } catch (e) { bodyText = String(e); }
      console.error('feed upstream error', r.status, bodyText);
      return res.status(r.status).json({ error: `Upstream returned ${r.status}`, upstream: bodyText });
    }
    const data = await r.json();
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('feed proxy error', err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
