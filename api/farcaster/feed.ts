/* Using 'any' for req/res to avoid requiring @vercel/node types */

// Proxy/feed endpoint to avoid CORS from the browser. Returns the raw JSON
// from the Farcaster gateway. Usage: GET /api/farcaster/feed?q=your+query

export default async function handler(req: any, res: any) {
  const q = (req.query.q || req.query.query || '') as string;
  try {
    const base = 'https://api.farcaster.xyz/v2/casts';
    // Default to fetching casts for a specific fid when no query is
    // provided. Use fid=75046798 as requested.
    const defaultFid = 75046798;
    const url = q ? `${base}?query=${encodeURIComponent(q)}&limit=20` : `${base}?fid=${defaultFid}&limit=20`;

    let r = await fetch(url);
    if (!r.ok) {
      // If the primary fetch fails, attempt a conservative fallback to fid=1.
      let bodyText = '';
      try { bodyText = await r.text(); } catch (e) { bodyText = String(e); }
      console.warn('feed upstream non-ok, retrying with fid=1', r.status, bodyText);
      r = await fetch(`${base}?fid=1&limit=20`);
      if (!r.ok) {
        let bodyText2 = '';
        try { bodyText2 = await r.text(); } catch (e) { bodyText2 = String(e); }
        console.error('feed upstream error after fid=1 fallback', r.status, bodyText2);
        return res.status(r.status).json({ error: `Upstream returned ${r.status}`, upstream: bodyText2 });
      }
    }
    const data = await r.json();
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('feed proxy error', err);
    return res.status(500).json({ error: err?.message || String(err) });
  }
}
