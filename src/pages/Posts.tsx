import React, { useEffect, useState } from 'react';
import './Spots.css';
import { useAlltracks, useGlobalContext } from '../components/Store';
import { useNotification } from '../context/NotificationContext';

type FarcasterCast = {
  hash: string;
  body: string;
  createdAt: number | string;
  author: {
    fid: number;
    displayName?: string;
    username?: string;
  };
};

export default function Posts() {
  const [casts, setCasts] = useState<FarcasterCast[]>([]);
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
      // Use the serverless feed proxy to avoid CORS: /api/farcaster/feed?q=...
      const base = '/api/farcaster/feed';
      const url = q ? `${base}?q=${encodeURIComponent(q)}` : base;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let data: any;
      // feed proxy should return JSON; try to parse safely
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        // if not JSON, fallback to empty
        data = null;
      }

      // Support multiple upstream shapes:
      // - { casts: [...] }
      // - { result: { casts: [...] }, next: ... }
      // - raw array [...]
      const source = (data && Array.isArray(data.casts) ? data.casts
        : (data && data.result && Array.isArray(data.result.casts) ? data.result.casts
        : (Array.isArray(data) ? data : [])));

      const list = source.map((c: any) => ({
        hash: c.hash || c.threadHash || c.castHash || String(Math.random()),
        body: c.body || c.text || c.processedCastText || '',
        createdAt: c.createdAt || c.timestamp || c.createdAtMs || Date.now(),
        author: (c.author ? { fid: c.author.fid, displayName: c.author.displayName, username: c.author.username }
          : (c.fid ? { fid: c.fid, displayName: c.displayName, username: c.username } : {})),
      }));
      setCasts(list);
    } catch (err) {
      console.error('Failed to fetch casts via server proxy', err);
      showNotification('Failed to fetch posts (network or proxy).', 'error');
      setCasts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCasts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePost = async () => {
    if (!text.trim()) return;
    if (!farcastConnected) {
      showNotification('Connect your wallet to post to Farcaster', 'error');
      return;
    }
    // Posting to Farcaster requires signing and a Farcaster relay/agent.
    // Here we POST to a backend endpoint if available: `/api/farcaster/post`.
    // The backend should handle signing/relaying to Farcaster on behalf of the connected wallet.
    setPosting(true);
    try {
      const res = await fetch('/api/farcaster/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `HTTP ${res.status}`);
      }
      showNotification('Post submitted (backend relay)', 'success');
      setText('');
      // refresh feed
      await fetchCasts(query || undefined);
    } catch (err) {
      console.error('Post failed', err);
      showNotification('Posting failed — no backend relay available', 'error');
    } finally {
      setPosting(false);
    }
  };

  const handleSearch = async () => {
    await fetchCasts(query || undefined);
  };

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
            // attempt wallet-based Farcaster login
            try {
              // get ethereum provider
              const provider: any = (window as any).ethereum;
              if (!provider) throw new Error('No Ethereum provider found (MetaMask)');
              const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' });
              const address = accounts[0];
              // request nonce from backend (optional)
              let nonce = '';
              try {
                const nr = await fetch('/api/farcaster/nonce');
                if (nr.ok) { const j = await nr.json(); nonce = j.nonce || ''; }
              } catch (e) {}
              const domain = window.location.host;
              const issuedAt = new Date().toISOString();
              const message = `${domain} requests sign-in for Farcaster integration.\n\nAddress: ${address}\nNonce: ${nonce}\nIssued At: ${issuedAt}`;
              const signature = await provider.request({ method: 'personal_sign', params: [message, address] });
              // send to backend to validate/create session
              const res = await fetch('/api/farcaster/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, message, signature }),
              });
              if (!res.ok) throw new Error('Auth failed');
              setFarcastAddress(address);
              setFarcastConnected(true);
              showNotification('Farcaster wallet connected', 'success');
            } catch (err: any) {
              console.error('Farcaster connect failed', err);
              showNotification('Farcaster connect failed: ' + (err?.message || ''), 'error');
            }
          }}>Connect Farcaster (wallet)</button>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ color: '#666' }}>Connected: {farcastAddress}</div>
            <button className="primary-btn" onClick={async () => {
              try {
                await fetch('/api/farcaster/logout', { method: 'POST' });
              } catch (e) {}
              setFarcastAddress(null);
              setFarcastConnected(false);
              showNotification('Farcaster disconnected', 'success');
            }}>Disconnect</button>
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

      <ul>
        {casts.map((c) => (
          <li key={c.hash} style={{ marginBottom: 12, border: '1px solid #eee', padding: 8, borderRadius: 6, background: '#fff' }}>
            <div style={{ fontSize: 14, marginBottom: 6 }}>{c.body}</div>
            <div style={{ color: '#666', fontSize: 12 }}>
              {c.author.displayName || c.author.username || `fid:${c.author.fid || '?'}`} — {new Date(Number(c.createdAt)).toLocaleString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
