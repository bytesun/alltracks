/* Using 'any' for req/res to avoid requiring @vercel/node types */

// Proxy/feed endpoint to avoid CORS from the browser. Returns the raw JSON
// from the Farcaster gateway. Usage: GET /api/farcaster/feed?q=your+query

export default async function handler(req: any, res: any) {
  const q = (req.query.q || req.query.query || '') as string;
  try {
    const base = 'https://api.farcaster.xyz/v2/casts';
    // The Farcaster `casts` endpoint requires filters (e.g. `fid`) when called
    // without a search query. Instead of defaulting to a single fid, query for
    // hiking-related terms so the app shows relevant posts by default.
    const defaultQuery = 'hiking OR hike OR trail OR outdoors';
    const url = q ? `${base}?query=${encodeURIComponent(q)}&limit=20` : `${base}?query=${encodeURIComponent(defaultQuery)}&limit=20`;
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
