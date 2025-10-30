import React,{useState,useEffect} from 'react';
import { Navbar } from './Navbar';
import { HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { LoginModal } from './LoginModal';
import { useGlobalContext,useSetAgent,useSetLoginModal } from './Store';

import { HOST, IDENTITY_PROVIDER, IDENTITY_PROVIDER_v2 } from "../lib/canisters";
import { DERIVATION_ORIGION,  ONE_WEEK_NS } from "../lib/constants";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const {
        state: { isAuthed },
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
      derivationOrigin: DERIVATION_ORIGION,
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
    } else if (method === 'google') {
      // Implement Google login
      handleNFIDLogin();
    }
    setLoginModal(false);
  };

  return (
    <>
      <Navbar />
      {children}
      <LoginModal 
        isOpen={loginModal}
        onClose={() => setLoginModal(false)}
        onLogin={handleLogin}
      />
    </>
  );
};
