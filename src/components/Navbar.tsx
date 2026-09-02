import React from 'react';
import { useNavigate } from 'react-router-dom';

import '../styles/Navbar.css';

import { DropdownMenu } from './DropdownMenu';
import { Link } from 'react-router-dom';

import { useGlobalContext, useSetLoginModal, useLogout } from "./Store";

export const Navbar = () => {
  const navigate = useNavigate();

  const {
    state: { isAuthed, principal },
  } = useGlobalContext();
  const logout = useLogout();
  const [, setLoginModal] = useSetLoginModal();

  const handleLogout = async () => {
    const AuthClient = (await import('@dfinity/auth-client')).AuthClient;
    const authClient = await AuthClient.create();
    await authClient.logout();
    logout();
  };

  const handleAuth = async () => {
    if (isAuthed) {
      handleLogout();
    } else {
      setLoginModal(true);
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand" onClick={() => navigate('/')}>
          <img src="/192x192.png" alt="AllTracks Logo" className="brand-logo" />
          <span className="brand-text">AllTracks</span>
        </div>

        <div className="nav-items">
          <div className="desktop-menu">
            <Link to="/" className="nav-link"><span className="material-icons">radio_button_checked</span>Record</Link>
            <Link to="/explore" className="nav-link"><span className="material-icons">explore</span>Explore</Link>
            <Link to="/trackathons" className="nav-link"><span className="material-icons">flag</span>Challenges</Link>
            {principal && (
              <Link to={`/tracks/${principal}`} className="nav-link"><span className="material-icons">history</span>History</Link>
            )}
            {isAuthed && (
              <Link to="/profile" className="nav-link"><span className="material-icons">person</span>Me</Link>
            )}
            {isAuthed && <button className="auth-button" onClick={handleAuth}>Sign Out</button>}
            {!isAuthed && <button className="auth-button" onClick={() => setLoginModal(true)}>Sign In</button>}
          </div>

          <div className="mobile-menu">
            <DropdownMenu isAuthed={isAuthed} onAuth={isAuthed ? handleAuth : () => setLoginModal(true)} />
          </div>
        </div>
      </nav>
    </>
  );
};
