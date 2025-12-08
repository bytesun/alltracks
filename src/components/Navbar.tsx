import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import '../styles/Navbar.css';

import { DropdownMenu } from './DropdownMenu';
import { Link } from 'react-router-dom';

import { useGlobalContext, useSetLoginModal, useSetAgent } from "./Store";

import { HOST, IDENTITY_PROVIDER, IDENTITY_PROVIDER_v2 } from "../lib/canisters";
import { DERIVATION_ORIGION, ONE_WEEK_NS } from "../lib/constants";

export const Navbar = () => {
  const navigate = useNavigate();

  const {
    state: { isAuthed, principal },
  } = useGlobalContext();
  const setAgent = useSetAgent();
  const [loginModal, setLoginModal] = useSetLoginModal();

  const [authClient, setAuthClient] = useState<AuthClient>(null);

  const handleIILogout = async () => {
    await authClient.logout();
    setAgent({ agent: null });
  };

  const handleAuth = async () => {
    if (isAuthed) {
      handleIILogout();
    } else {
      // setLoginModal(true);
      handleIIV2Login()
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

          {/* Desktop menu items */}
          <div className="desktop-menu">
            <Link to="/trackathons" className="nav-link"><span className="material-icons">flag</span>Trackathons</Link>

            {/* <Link to="/everpeace" className="nav-link"><span className="material-icons">terrain</span>Everpeace</Link> */}
            {/* <Link to="https://icevent.app" className="nav-link"><span className="material-icons">event</span>Events</Link> */}
            <Link to="/spots" className="nav-link"><span className="material-icons">place</span>Spots</Link>
            {/* <Link to="/posts" className="nav-link"><span className="material-icons">chat_bubble</span>Posts</Link> */}

            <Link to="/status" className="nav-link"> <span className="material-icons">info</span>Status</Link>
            {principal && <Link to={`/user/${principal}`} className="nav-link"><span className="material-icons">timeline</span>Timeline</Link>}
            {isAuthed && <Link to="/profile" className="nav-link"><span className="material-icons">person</span>Profile</Link>}
            {isAuthed && <button className="auth-button" onClick={(handleAuth)}>
              Sign Out
            </button>}
            {!isAuthed && <button className="auth-button" onClick={() => setLoginModal(true)}>
              Sign In
            </button>}
          </div>

          <div className="mobile-menu">
            <DropdownMenu isAuthed={isAuthed} onAuth={isAuthed ? handleAuth : () => setLoginModal(true)} />
          </div>
        </div>
      </nav>

    </>
  );
};