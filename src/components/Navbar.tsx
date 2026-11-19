import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navbar.css';
import { DropdownMenu } from './DropdownMenu';
import { useGlobalContext, useSetLoginModal, useLogout } from './Store';

export const Navbar = () => {
  const { state: { isAuthed } } = useGlobalContext();
  const logout = useLogout();
  const [, setLoginModal] = useSetLoginModal();

  const handleLogout = async () => {
    // Revoke the UI session before any asynchronous AuthClient work.
    logout();
    const AuthClient = (await import('@dfinity/auth-client')).AuthClient;
    const authClient = await AuthClient.create();
    await authClient.logout();
    try {
      localStorage.setItem('alltracks:session-event', JSON.stringify({ event: 'logout', at: Date.now() }));
    } catch { /* Sign out must work even when storage is unavailable. */ }
  };

  const handleAuth = async () => {
    if (isAuthed) {
      await handleLogout();
    } else {
      setLoginModal(true);
    }
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand" aria-label="AllTracks home">
        <img src="/192x192.png" alt="" className="brand-logo" />
        <span className="brand-text">AllTracks</span>
      </Link>

      <div className="nav-items">
        <div className="desktop-menu">
          <Link to="/explore" className="nav-link"><span className="material-icons">explore</span>Explore</Link>
          <Link to="/spots" className="nav-link"><span className="material-icons">qr_code</span>Check In</Link>
          <Link to="/trackathons" className="nav-link"><span className="material-icons">flag</span>Challenges</Link>
          <Link to="/objects" className="nav-link"><span className="material-icons">qr_code_2</span>Wanderers</Link>
          <Link to="/history" className="nav-link"><span className="material-icons">history</span>History</Link>
          {isAuthed && (
            <Link to="/profile" className="nav-link"><span className="material-icons">person</span>Me</Link>
          )}
          {isAuthed
            ? <button className="auth-button" onClick={handleAuth}>Sign Out</button>
            : <button className="auth-button" onClick={() => setLoginModal(true)}>Sign In</button>}
        </div>

        <div className="mobile-menu">
          <DropdownMenu isAuthed={isAuthed} onAuth={isAuthed ? handleAuth : async () => setLoginModal(true)} />
        </div>
      </div>
    </nav>
  );
};
