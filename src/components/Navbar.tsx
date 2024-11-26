import React,{useEffect,useState} from 'react';
import {Navigate, useNavigate } from 'react-router-dom';
import { HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import '../styles/Navbar.css';

import { DropdownMenu } from './DropdownMenu';
import { Link } from 'react-router-dom';
import { authSubscribe, signIn, signOut } from '@junobuild/core';
import { useStats } from '../context/StatsContext';
import { getDoc } from '@junobuild/core';
import { UserStats } from '../types/UserStats';
import { ProfileSettings } from '../types/profileSettings';
import { useGlobalContext, useLoginModal, useSetAgent } from "./Store";

import { HOST, IDENTITY_PROVIDER, derivationOrigin } from "../lib/canisters";
import { DERIVATION_ORIGION,  ONE_WEEK_NS } from "../lib/constants";

export const Navbar = () => {
  const navigate = useNavigate();
  
  const { settings, updateSettings } = useStats();

  const {
    state: { isAuthed },
  } = useGlobalContext();
  const setAgent = useSetAgent();
  const [authClient, setAuthClient] = useState<AuthClient>(null);


  // Auth on refresh
  useEffect(() => {
    (async () => {
      const authClient = await AuthClient.create(
        {
          idleOptions: {
            disableIdle: true,
            disableDefaultIdleCallback: true
          }
        }
      );
      setAuthClient(authClient);     
        if (await authClient.isAuthenticated()) {
          handleAuthenticated(authClient);
        }

    })();
  }, []);

  const handleAuthenticated = async (authClient) => {
    // auth.signin(authClient,()=>{});
    const identity = authClient.getIdentity();
    setAgent({
      agent: new HttpAgent({
        identity,
        host: HOST,
      }),
      isAuthed: true,

    });

  };


  const handleIILogin = async () => {
    console.log("login II with " + derivationOrigin)
    authClient.login({
      derivationOrigin: DERIVATION_ORIGION,
      identityProvider: IDENTITY_PROVIDER,
      maxTimeToLive: ONE_WEEK_NS,
      onSuccess: () => {
        const identity = authClient.getIdentity();
        setAgent({
          agent: new HttpAgent({
            identity,
            host: HOST,
          }),
          isAuthed: true,
        });
      },
    });
  };

  const handleIILogout = async () => {
    await authClient.logout();
    setAgent({ agent: null });
  };

 

  // useEffect(() => {
  //   const loadUserSettings = async () => {
  //     if (user?.key) {
  //       const statDoc = await getDoc<ProfileSettings>({
  //         collection: "profiles",
  //         key: user.key,
  //       });
        
  //       if (statDoc?.data) {
  //         updateSettings(statDoc.data);
  //       }
  //     }
  //   };

  //   loadUserSettings();
  // }, [user]);

  const handleAuth = async () => {
    if(isAuthed) {
      handleIILogout();
    } else {
      handleIILogin();
    }

    // if (user) {
    //   await signOut();
    // } else {
    //   await signIn({
    //     derivationOrigin:"https://32pz7-5qaaa-aaaag-qacra-cai.raw.ic0.app", 
    //     maxTimeToLive: BigInt(24 * 60 * 60 * 1000 * 1000 * 1000) //24 hours
    //   });
    //   //navigate('/profile');
    // }
  };
  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate('/')}> 
        <img src="/192x192.png" alt="AllTracks Logo" className="brand-logo" />       
        <span className="brand-text">AllTracks</span>
      </div>
      
      <div className="nav-items">
        
        {/* Desktop menu items */}
        <div className="desktop-menu">
          <Link to="/trails" className="nav-link"><span className="material-icons">terrain</span>Trails</Link>
          <Link to="https://icevent.app" className="nav-link"><span className="material-icons">event</span>Events</Link>
          <Link to="/status" className="nav-link"> <span className="material-icons">info</span>Status</Link>
          {isAuthed && <Link to="/profile" className="nav-link"><span className="material-icons">person</span>Profile</Link>}
          {isAuthed && <button className="auth-button" onClick={handleIILogout}>
             Sign Out
          </button>}
          {!isAuthed && <button className="auth-button" onClick={handleIILogin}>
             Sign In
          </button>}
        </div>

        {/* Mobile dropdown menu */}
        <div className="mobile-menu">
          <DropdownMenu isAuthed={isAuthed} onAuth={handleAuth} />
        </div>
      </div>
    </nav>
  );
};