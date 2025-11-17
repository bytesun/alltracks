import React,{useEffect,useState} from 'react';
import {Navigate, useNavigate } from 'react-router-dom';
import { HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import '../styles/Navbar.css';

import { DropdownMenu } from './DropdownMenu';
import { Link } from 'react-router-dom';

import { useGlobalContext, useSetLoginModal, useSetAgent } from "./Store";

import { HOST, IDENTITY_PROVIDER, IDENTITY_PROVIDER_v2 } from "../lib/canisters";
import { DERIVATION_ORIGION,  ONE_WEEK_NS } from "../lib/constants";

export const Navbar = () => {
  const navigate = useNavigate();

  const {
    state: { isAuthed, principal },
  } = useGlobalContext();
  const setAgent = useSetAgent();
  const [loginModal, setLoginModal] = useSetLoginModal();

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

    authClient.login({
      derivationOrigin: DERIVATION_ORIGION,
      identityProvider: IDENTITY_PROVIDER_v2,
      maxTimeToLive: ONE_WEEK_NS,
      windowOpenerFeatures: windowFeatures,
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

  const handleIIV2Login = async () => {

    authClient.login({
      // derivationOrigin: DERIVATION_ORIGION,
      identityProvider: IDENTITY_PROVIDER_v2,
      maxTimeToLive: ONE_WEEK_NS,
      windowOpenerFeatures: windowFeatures,
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
    authClient.login({
      identityProvider: "https://nfid.one" + AUTH_PATH,
      maxTimeToLive: ONE_WEEK_NS,
      // derivationOrigin: DERIVATION_ORIGION,
      windowOpenerFeatures:
        `left=${window.screen.width / 2 - 525}, ` +
        `top=${window.screen.height / 2 - 705},` +
        `toolbar=0,location=0,menubar=0,width=525,height=705`,
      onSuccess: () => {
        const identity = authClient.getIdentity();
        setAgent({
          agent: new HttpAgent({
            identity,
            host: HOST,
          }),
          isAuthed: true,
        });
      }
    });
  };

  const handleLogin = (method: string) => {
    if (method === 'ii') {
      handleIILogin();
    } else if (method === 'iiv2') {
      // Implement II v2 login
      handleIIV2Login();
    } else if (method === 'google') {
      // Implement Google login
      handleNFIDLogin();
    }
    setLoginModal(false);
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


    // if (user) {
    //   await signOut();
    // } else {
    //   await signIn({
    //     derivationOrigin:"https://32pz7-5qaaa-aaaag-qacra-cai.raw.ic0.app", 
    //     maxTimeToLive: BigInt(24 * 60 * 60 * 1000 * 1000 * 1000) //24 hours
    //   });
    //   //navigate('/profile');
    // }
  // };

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

          <Link to="https://icevent.app" className="nav-link"><span className="material-icons">event</span>Events</Link>
          <Link to="/spots" className="nav-link"><span className="material-icons">place</span>Spots</Link>
          <Link to="/status" className="nav-link"> <span className="material-icons">info</span>Status</Link>
          {principal &&<Link to={`/user/${principal}`} className="nav-link"><span className="material-icons">timeline</span>Timeline</Link>}
          {isAuthed && <Link to="/profile" className="nav-link"><span className="material-icons">person</span>Profile</Link>}
          {isAuthed && <button className="auth-button" onClick={handleAuth}>
             Sign Out
          </button>}
          {!isAuthed && <button className="auth-button" onClick={handleIIV2Login}>
             Sign In
          </button>}
        </div>

        <div className="mobile-menu">
          <DropdownMenu isAuthed={isAuthed} onAuth={handleAuth} />
        </div>
      </div>
    </nav>
   
      </>
  );
};