import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'node:crypto';

// Public, consent-based object check-ins. Exact GPS coordinates are deliberately
// rounded before storage; nobody's IP address or identity is persisted.
type Action = 'found' | 'carried' | 'left';
type Checkin = {
  id: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  action: Action;
  note: string;
  createdAt: string;
};
const ID_RE = /^[a-z0-9][a-z0-9-]{2,48}$/;
const ACTIONS: Action[] = ['found', 'carried', 'left'];

async function redis(command: (string | number)[]) {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('STORAGE_NOT_CONFIGURED');
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!response.ok) throw new Error('STORAGE_UNAVAILABLE');
  const payload = await response.json() as { result?: unknown; error?: string };
  if (payload.error) throw new Error('STORAGE_UNAVAILABLE');
  return payload.result;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const objectId = typeof req.query.id === 'string' ? req.query.id : '';
  if (!ID_RE.test(objectId)) return res.status(400).json({ error: 'Invalid object ID' });
  const key = `track-me-down:v1:${objectId}`;

  try {
    if (req.method === 'GET') {
      const raw = await redis(['LRANGE', key, 0, 199]);
      const checkins = (Array.isArray(raw) ? raw : []).flatMap((item) => {
        try { return [JSON.parse(String(item)) as Checkin]; } catch { return []; }
      });
      return res.status(200).json({ objectId, checkins });
    }

    let body: Record<string, unknown>;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid request');
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const lat = body.latitude;
    const lng = body.longitude;
    const accuracy = body.accuracyMeters;
    const action = body.action;
    const note = body.note;
    if (typeof lat !== 'number' || !Number.isFinite(lat) || Math.abs(lat) > 90 ||
        typeof lng !== 'number' || !Number.isFinite(lng) || Math.abs(lng) > 180 ||
        typeof action !== 'string' || !ACTIONS.includes(action as Action) ||
        typeof note !== 'string' || note.length > 280 ||
        !(accuracy === null || (typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy >= 0 && accuracy <= 2000))) {
      return res.status(400).json({ error: 'Invalid check-in data' });
    }

    // Lightweight anti-spam: at most one submission per item + network fingerprint
    // every 60 seconds. Never store the raw IP address.
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress) || 'unknown';
    const salt = process.env.UPSTASH_REDIS_REST_TOKEN || '';
    const fingerprint = createHash('sha256').update(`${salt}:${objectId}:${ip}`).digest('hex');
    const reserved = await redis(['SET', `${key}:rate:${fingerprint}`, '1', 'EX', 60, 'NX']);
    if (reserved !== 'OK') return res.status(429).json({ error: 'Please try again in one minute.' });

    const checkin: Checkin = {
      id: createHash('sha256').update(`${Date.now()}:${Math.random()}:${fingerprint}`).digest('hex').slice(0, 18),
      latitude: Number(lat.toFixed(3)),
      longitude: Number(lng.toFixed(3)),
      accuracyMeters: accuracy === null ? null : Math.round(accuracy as number),
      action: action as Action,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };
    await redis(['LPUSH', key, JSON.stringify(checkin)]);
    await redis(['LTRIM', key, 0, 499]);
    return res.status(201).json({ checkin });
  } catch (error) {
    const notConfigured = error instanceof Error && error.message === 'STORAGE_NOT_CONFIGURED';
    return res.status(503).json({
      error: notConfigured ? 'Journey storage has not been configured yet.' : 'Journey storage is temporarily unavailable.',
    });
  }
}
