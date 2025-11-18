import React, { useEffect, useState } from 'react';
import './Spots.css';
import { useAlltracks, useGlobalContext } from '../components/Store';
import { useNotification } from '../context/NotificationContext';

type Cast = {
  hash: string;
  body: string;
  createdAt: number;
  author: { fid?: number; displayName?: string; username?: string; pfp?: string | null };
  image?: string | null;
  raw?: any;
};

export default function Posts() {
  const [casts, setCasts] = useState<Cast[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [query, setQuery] = useState('');
  const [farcastAddress, setFarcastAddress] = useState<string | null>(null);
  const [farcastConnected, setFarcastConnected] = useState(false);
  const { state: { isAuthed } } = useGlobalContext();
  const { showNotification } = useNotification();

  const fetchCasts = async (q?: string) => {
    setLoading(true);
    try {
      const base = '/api/farcaster/feed';
      const url = q ? `${base}?q=${encodeURIComponent(q)}` : base;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const textBody = await res.text();
      let data: any = null;
      try { data = JSON.parse(textBody); } catch (e) { data = null; }

      const source = (data && Array.isArray(data.casts) ? data.casts
        : (data && data.result && Array.isArray(data.result.casts) ? data.result.casts
        : (Array.isArray(data) ? data : [])));

      const list = source.map((c: any) => {
        const body = c.body || c.text || c.processedCastText || (c.cast && c.cast.body) || '';
        const createdAtRaw = c.createdAt || c.ts || c.timestamp || (c.cast && c.cast.createdAt) || Date.now();
        const createdAt = typeof createdAtRaw === 'string' ? parseInt(createdAtRaw, 10) : createdAtRaw;

        const authorObj = c.author || c.identity || c.user || (c.cast && c.cast.author) || {};
        let pfp: string | null = null;
        if (authorObj?.pfp) pfp = authorObj.pfp?.url || authorObj.pfp;
        else if (authorObj?.avatar) pfp = authorObj.avatar;
        else if (authorObj?.profileImageUrl) pfp = authorObj.profileImageUrl;

        let image: string | null = null;
        if (c.embeds && Array.isArray(c.embeds)) {
          const img = c.embeds.find((e: any) => e.type === 'image' && (e.url || e.staticRaster));
          if (img) image = img.url || img.staticRaster || null;
        }
        if (!image && c.processedMedia && Array.isArray(c.processedMedia) && c.processedMedia.length) {
          const pm = c.processedMedia[0];
          if (pm && (pm.url || pm.staticRaster)) image = pm.url || pm.staticRaster || null;
        }

        return {
          hash: c.hash || c.castHash || c.cid || (c.cast && c.cast.hash) || Math.random().toString(36).slice(2),
          body,
          createdAt: Number(createdAt),
          author: {
            fid: authorObj?.fid,
            displayName: authorObj?.displayName || authorObj?.name,
            username: authorObj?.username || authorObj?.handle || (authorObj?.fid ? String(authorObj.fid) : undefined),
            pfp,
          },
          image,
          raw: c,
        } as Cast;
      });
      setCasts(list);
    } catch (err) {
      console.error('Failed to fetch casts via server proxy', err);
      showNotification('Failed to fetch posts (network or proxy).', 'error');
      setCasts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCasts(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

  const handlePost = async () => {
    if (!text.trim()) return;
    if (!farcastConnected) { showNotification('Connect your wallet to post to Farcaster', 'error'); return; }
    setPosting(true);
    try {
      const res = await fetch('/api/farcaster/post', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) { const body = await res.text(); throw new Error(body || `HTTP ${res.status}`); }
      showNotification('Post submitted (backend relay)', 'success');
      setText(''); await fetchCasts(query || undefined);
    } catch (err) {
      console.error('Post failed', err); showNotification('Posting failed — no backend relay available', 'error');
    } finally { setPosting(false); }
  };

  const handleSearch = async () => { await fetchCasts(query || undefined); };

  return (
    <div className="page-container">
      <h2>Posts (Farcaster)</h2>

      <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input className="spot-search-input" placeholder="Search posts (server-side)" value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="primary-btn" onClick={handleSearch} disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
        <button className="primary-btn" onClick={() => { setQuery(''); fetchCasts(); }}>Reset</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        {!farcastConnected ? (
          <button className="primary-btn" onClick={async () => {
            try {
              const provider: any = (window as any).ethereum;
              if (!provider) throw new Error('No Ethereum provider found (MetaMask)');
              const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' });
              const address = accounts[0];
              let nonce = '';
              try { const nr = await fetch('/api/farcaster/nonce'); if (nr.ok) { const j = await nr.json(); nonce = j.nonce || ''; } } catch (e) {}
              const domain = window.location.host; const issuedAt = new Date().toISOString();
              const message = `${domain} requests sign-in for Farcaster integration.\n\nAddress: ${address}\nNonce: ${nonce}\nIssued At: ${issuedAt}`;
              const signature = await provider.request({ method: 'personal_sign', params: [message, address] });
              const res = await fetch('/api/farcaster/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address, message, signature }) });
              if (!res.ok) throw new Error('Auth failed'); setFarcastAddress(address); setFarcastConnected(true); showNotification('Farcaster wallet connected', 'success');
            } catch (err: any) { console.error('Farcaster connect failed', err); showNotification('Farcaster connect failed: ' + (err?.message || ''), 'error'); }
          }}>Connect Farcaster (wallet)</button>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ color: '#666' }}>Connected: {farcastAddress}</div>
            <button className="primary-btn" onClick={async () => { try { await fetch('/api/farcaster/logout', { method: 'POST' }); } catch (e) {} setFarcastAddress(null); setFarcastConnected(false); showNotification('Farcaster disconnected', 'success'); }}>Disconnect</button>
          </div>
        )}
      </div>

      {isAuthed && (
        <div style={{ marginBottom: 12 }}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} style={{ width: '100%', padding: 8 }} placeholder="Write a post... (requires backend relay to publish)" />
          <div style={{ marginTop: 8 }}>
            <button className="primary-btn" onClick={handlePost} disabled={posting}>{posting ? 'Posting…' : 'Post'}</button>
            <span style={{ marginLeft: 12, color: '#666' }}>Publishing requires a backend relay that signs and forwards to Farcaster.</span>
          </div>
        </div>
      )}

      {loading && <p>Loading posts…</p>}
      {!loading && casts.length === 0 && <p>No posts found.</p>}

      <ul className="post-list">
        {casts.map((c) => (
          <li className="post-card" key={c.hash}>
            <div className="post-avatar">
              {c.author?.pfp ? (
                // eslint-disable-next-line jsx-a11y/img-redundant-alt
                <img src={c.author.pfp as string} alt={c.author.username || 'avatar'} />
              ) : (
                <img src="/assets/face-red.svg" alt="avatar" />
              )}
            </div>
            <div className="post-body">
              <div className="post-header">
                <div className="post-author-name">{c.author.displayName || c.author.username}</div>
                <div className="post-author-username">@{c.author.username}</div>
                <div className="post-time">{new Date(c.createdAt).toLocaleString()}</div>
              </div>
              <div className="post-text">{c.body}</div>
              {c.image && (
                // eslint-disable-next-line jsx-a11y/img-redundant-alt
                <img src={c.image} alt="post image" className="post-image" />
              )}
              <div className="post-actions">
                <button>Reply</button>
                <button>Like</button>
                <button>Share</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
