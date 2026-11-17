import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAlltracks, useComment, useGlobalContext } from './Store';
import {
  CHECKIN_OUTBOX_EVENT,
  deletePendingCheckin,
  isOffline,
  listPendingCheckins,
  type PendingCheckin,
} from '../lib/offlineCheckins';
import { flushSignedInCheckins } from '../lib/checkinSync';
import './CheckinOutboxManager.css';

/**
 * Runs across AllTracks routes. When the browser is open, a network reconnect,
 * restored authenticated session, return to the tab or periodic retry will
 * synchronize previously saved, signed-in Checkpoints and Spot comments.
 * Anonymous guest records need a NEW Turnstile challenge on the Object page;
 * they cannot be silently posted after an offline period.
 */
export function CheckinOutboxManager() {
  const backend = useAlltracks();
  const comments = useComment();
  const { state: { isAuthed, principal } } = useGlobalContext();
  const principalText = isAuthed && principal ? principal.toText() : null;

  const [items, setItems] = useState<PendingCheckin[]>([]);
  const [online, setOnline] = useState(() => !isOffline());
  const [syncing, setSyncing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const running = useRef(false);

  const reload = useCallback(async () => {
    try { setItems(await listPendingCheckins()); }
    catch { /* Storage can be disabled in private browsing; submission reports errors. */ }
  }, []);

  const sync = useCallback(async (force = false) => {
    if (running.current || !principalText || isOffline()) return;
    running.current = true;
    setSyncing(true);
    try {
      await flushSignedInCheckins(backend, comments, principalText, force);
    } finally {
      running.current = false;
      setSyncing(false);
      await reload();
    }
  }, [backend, comments, principalText, reload]);

  useEffect(() => {
    void reload();
    const changed = () => void reload();
    const reconnected = () => {
      setOnline(true);
      void sync(true);
    };
    const disconnected = () => {
      setOnline(false);
      void reload();
    };
    const returned = () => {
      if (document.visibilityState === 'visible') {
        setOnline(!isOffline());
        void sync(true);
      }
    };
    window.addEventListener(CHECKIN_OUTBOX_EVENT, changed);
    window.addEventListener('online', reconnected);
    window.addEventListener('offline', disconnected);
    document.addEventListener('visibilitychange', returned);
    const interval = window.setInterval(() => void sync(), 30_000);
    if (!isOffline()) void sync(true);
    return () => {
      window.removeEventListener(CHECKIN_OUTBOX_EVENT, changed);
      window.removeEventListener('online', reconnected);
      window.removeEventListener('offline', disconnected);
      document.removeEventListener('visibilitychange', returned);
      window.clearInterval(interval);
    };
  }, [reload, sync]);

  if (!items.length) return null;
  const guestItems = items.filter(item => item.kind === 'object' && !item.principal);
  const awaitingOtherLogin = items.some(item => item.principal && item.principal !== principalText);
  const firstGuest = guestItems[0];

  const discard = async (item: PendingCheckin) => {
    if (!window.confirm('Delete this locally saved check-in? This cannot be undone.')) return;
    await deletePendingCheckin(item.id);
    await reload();
  };

  return (
    <aside className="checkin-outbox" role="status" aria-live="polite">
      <div className="checkin-outbox-main">
        <span aria-hidden="true">{online ? '☁️' : '📴'}</span>
        <span>
          <strong>{items.length} check-in{items.length === 1 ? '' : 's'} saved on this device.</strong>{' '}
          {online
            ? syncing ? 'Syncing…' : 'Pending sync.'
            : 'Offline — sync will retry when the network returns.'}
        </span>
        <button type="button" onClick={() => void sync(true)} disabled={!online || syncing || !principalText}>
          {syncing ? 'Syncing…' : 'Retry'}
        </button>
        <button type="button" onClick={() => setExpanded(v => !v)} aria-expanded={expanded}>
          {expanded ? 'Hide' : 'Details'}
        </button>
      </div>
      {guestItems.length > 0 && (
        <p>
          {guestItems.length} guest check-in{guestItems.length === 1 ? '' : 's'} need a new
          human verification after reconnecting.{' '}
          {firstGuest && <Link to={'/object/' + encodeURIComponent(firstGuest.objectId)}>
            Open object to verify
          </Link>}
        </p>
      )}
      {awaitingOtherLogin && <p>Some records belong to a different account. Sign in with their original account to sync.</p>}
      {expanded && (
        <ul>
          {items.map(item => (
            <li key={item.id}>
              <span>
                {item.kind === 'object' ? 'Object ' + item.objectId : 'Spot ' + item.spotId}
                {' · '}{new Date(item.createdAt).toLocaleString()}
                {item.lastError && <small>Last attempt: {item.lastError}</small>}
              </span>
              <button type="button" onClick={() => void discard(item)}>Discard</button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
