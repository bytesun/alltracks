import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './Navbar';
import { classifyRequestFailure } from "../lib/requestFailure";
import { CheckinOutboxManager } from './CheckinOutboxManager';
import { HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { LoginModal } from './LoginModal';
import { Chat } from './Chat';
import { useGlobalContext, useSetAgent, useSetLoginModal } from './Store';

import { HOST, IDENTITY_PROVIDER, IDENTITY_PROVIDER_v2 } from "../lib/canisters";
import { DERIVATION_ORIGION, ONE_WEEK_NS } from "../lib/constants";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    state: { isAuthed },
  } = useGlobalContext();
  const setAgent = useSetAgent();
  const setAgentRef = useRef(setAgent);
  setAgentRef.current = setAgent;
  const [loginModal, setLoginModal] = useSetLoginModal();

  const [authClient, setAuthClient] = useState<AuthClient | null>(null);
  const [sessionNotice, setSessionNotice] = useState<'expired' | 'expiring' | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [networkError, setNetworkError] = useState(false);
  const lastPrincipal = useRef<string | null>(null);
  const expiredRef = useRef(false);
  const clientRef = useRef<AuthClient | null>(null);
  const broadcastSession = (event: 'login' | 'logout') => {
    try { localStorage.setItem('alltracks:session-event', JSON.stringify({ event, at: Date.now() })); }
    catch { /* Storage may be unavailable; local session still works. */ }
  };

  const expireSession = useCallback(async (client: AuthClient) => {
    if (expiredRef.current) return;
    expiredRef.current = true;
    setSessionNotice('expired');
    await setAgentRef.current({ agent: null });
    broadcastSession('logout');
    try { await client.logout(); } catch (error) { console.warn('Session logout failed', error); }
  }, []);

  const validateSession = useCallback(async (client: AuthClient) => {
    try {
      const authenticated = await client.isAuthenticated();
      const identity = client.getIdentity();
      const delegation = 'getDelegation' in identity
        ? (identity as { getDelegation: () => { delegations: Array<{ delegation: { expiration: bigint } }> } }).getDelegation()
        : null;
      const expirations = delegation?.delegations.map(item => item.delegation.expiration) ?? [];
      const expiresAt = expirations.length ? expirations.reduce((a, b) => a < b ? a : b) : null;
      const now = BigInt(Date.now()) * 1_000_000n;
      if (!authenticated || identity.getPrincipal().isAnonymous() || (expiresAt !== null && expiresAt <= now)) {
        if (lastPrincipal.current) await expireSession(client);
        return false;
      }
      if (expiresAt !== null && expiresAt - now <= 300_000_000_000n) setSessionNotice('expiring');
      else setSessionNotice(null);
      return true;
    } catch (error) {
      // A transient storage or browser error must not be interpreted as an empty dataset.
      console.error('Unable to validate session', error);
      setAuthError('Unable to verify your session. Please check your connection and retry.');
      return false;
    }
  }, [expireSession]);

  useEffect(() => {
    let mounted = true;
    AuthClient.create({
      idleOptions: {
        idleTimeout: 1000 * 60 * 60 * 24,
        disableDefaultIdleCallback: true,
        onIdle: () => { if (clientRef.current) void expireSession(clientRef.current); },
      },
    }).then(async client => {
      if (!mounted) return;
      clientRef.current = client;
      setAuthClient(client);
      if (await client.isAuthenticated() && await validateSession(client)) {
        const identity = client.getIdentity();
        lastPrincipal.current = identity.getPrincipal().toText();
        await setAgentRef.current({ agent: new HttpAgent({ identity, host: HOST }), isAuthed: true });
      }
    }).catch(error => {
      console.error('Authentication initialization failed', error);
      if (mounted) setAuthError('Unable to initialize sign-in. Please reload and retry.');
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!authClient || !isAuthed) return;
    const check = () => { void validateSession(authClient); };
    const interval = window.setInterval(check, 60_000);
    window.addEventListener('focus', check);
    const onVisibility = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisibility);
    check();
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [authClient, isAuthed, validateSession]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== 'alltracks:session-event' || !event.newValue || !clientRef.current) return;
      try {
        const message = JSON.parse(event.newValue) as { event?: string };
        if (message.event === 'logout') void expireSession(clientRef.current);
        else if (message.event === 'login') void validateSession(clientRef.current);
      } catch { /* Ignore malformed cross-tab messages. */ }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [expireSession, validateSession]);

  useEffect(() => {
    const onRejectedRequest = (event: PromiseRejectionEvent) => {
      const category = classifyRequestFailure(event.reason);
      if (category === 'authentication' && clientRef.current && lastPrincipal.current) {
        void expireSession(clientRef.current);
      } else if (category === 'network') {
        setNetworkError(true);
      }
      // Do not swallow the rejection: callers still own their error handling.
    };
    window.addEventListener('unhandledrejection', onRejectedRequest);
    return () => window.removeEventListener('unhandledrejection', onRejectedRequest);
  }, [expireSession]);

  const restoreSession = async (client: AuthClient) => {
    if (!(await validateSession(client))) return;
    const identity = client.getIdentity();
    lastPrincipal.current = identity.getPrincipal().toText();
    expiredRef.current = false;
    setSessionNotice(null);
    setAuthError(null);
    await setAgentRef.current({ agent: new HttpAgent({ identity, host: HOST }), isAuthed: true });
    broadcastSession('login');
  };

  let windowFeatures = undefined
  const isDesktop = window.innerWidth > 768
  if (isDesktop) {
    const width = 500
    const height = 600
    const left = window.screenX + (window.innerWidth - width) / 2
    const top = window.screenY + (window.innerHeight - height) / 2
    windowFeatures = `left=${left},top=${top},width=${width},height=${height}`
  }
  const handleIILogin = async () => {

    if (!authClient) return;
    authClient.login({
      derivationOrigin: DERIVATION_ORIGION,
      identityProvider: IDENTITY_PROVIDER,
      maxTimeToLive: ONE_WEEK_NS,
      windowOpenerFeatures: windowFeatures,
      onSuccess: () => {
        void restoreSession(authClient);
      },
    });
  };

  const handleII2Login = async () => {
    if (!authClient) return;
    authClient.login({
      derivationOrigin: DERIVATION_ORIGION,
      identityProvider: IDENTITY_PROVIDER_v2,
      maxTimeToLive: ONE_WEEK_NS,
      windowOpenerFeatures: windowFeatures,
      onSuccess: () => {
        void restoreSession(authClient);
      },
    });
  };
  const handleIILogout = async () => {
    if (!authClient) return;
    await authClient.logout();
    broadcastSession('logout');
    lastPrincipal.current = null;
    expiredRef.current = false;
    setSessionNotice(null);
    await setAgentRef.current({ agent: null });
  };

  const handleAuth = async () => {
    if (isAuthed) {
      handleIILogout();
    } else {
      setLoginModal(true);
    }
  };
  const APPLICATION_NAME = "AllTracks";
  const APPLICATION_LOGO_URL = "/192x192.png";

  const AUTH_PATH = "/authenticate/?applicationName=" + APPLICATION_NAME + "&applicationLogo=" + APPLICATION_LOGO_URL + "#authorize";
  const handleNFIDLogin = async () => {
    if (!authClient) return;
    authClient.login({
      identityProvider: "https://nfid.one" + AUTH_PATH,
      maxTimeToLive: ONE_WEEK_NS,
      derivationOrigin: DERIVATION_ORIGION,
      windowOpenerFeatures:
        `left=${window.screen.width / 2 - 525}, ` +
        `top=${window.screen.height / 2 - 705},` +
        `toolbar=0,location=0,menubar=0,width=525,height=705`,
      onSuccess: () => {
        void restoreSession(authClient);
      }
    });
  };
  const handleLogin = (method: string) => {
    if (method === 'ii') {
      handleIILogin();
    } else if (method === 'google') {
      // Implement Google login
      handleNFIDLogin();
    } else if (method === 'iiv2') {
      handleII2Login();
    }
    setLoginModal(false);
  };

  return (
    <>
      <Navbar />
      {(sessionNotice || authError || networkError) && (
        <div role="alert" style={{ position: 'sticky', top: 0, zIndex: 1100, padding: '12px 20px', background: '#fff4d6', color: '#4c3600', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span>{authError || (networkError && !sessionNotice ? 'Network request failed. Your session has not been signed out.' : null) || (sessionNotice === 'expired'
            ? 'Your session has expired. Sign in again to continue. Your current page will be preserved.'
            : 'Your session will expire soon. Sign in again to continue without interruption.')}</span>
          <button type="button" onClick={() => { setAuthError(null); setNetworkError(false); setLoginModal(true); }}>
            Sign In Again
          </button>
          {(authError || networkError) && <button type="button" onClick={() => { setNetworkError(false); setAuthError(null); if (authClient) void validateSession(authClient); }}>Retry</button>}
        </div>
      )}
      <CheckinOutboxManager />
      {children}
      <Chat />
      <LoginModal
        isOpen={loginModal}
        onClose={() => setLoginModal(false)}
        onLogin={handleLogin}
      />
    </>
  );
};
