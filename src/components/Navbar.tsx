import React,{useEffect,useState} from 'react';
import {Navigate, useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';
import { User } from "@junobuild/core";
import { DropdownMenu } from './DropdownMenu';
import { Link } from 'react-router-dom';
import { authSubscribe, signIn, signOut } from '@junobuild/core';
import { useStats } from '../context/StatsContext';
import { getDoc } from '@junobuild/core';
import { UserStats } from '../types/UserStats';
import { ProfileSettings } from '../types/profileSettings';
export const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const { settings, updateSettings } = useStats();

  useEffect(() => {
    const unsubscribe = authSubscribe((user: User | null) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadUserSettings = async () => {
      if (user?.key) {
        const statDoc = await getDoc<ProfileSettings>({
          collection: "profiles",
          key: user.key,
        });
        
        if (statDoc?.data) {
          updateSettings(statDoc.data);
        }
      }
    };

    loadUserSettings();
  }, [user]);

  const handleAuth = async () => {
    if (user) {
      await signOut();
    } else {
      await signIn({
         derivationOrigin:"https://32pz7-5qaaa-aaaag-qacra-cai.raw.ic0.app", 
        maxTimeToLive: BigInt(24 * 60 * 60 * 1000 * 1000 * 1000) //24 hours
      });
      //navigate('/profile');
    }
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
          <Link to="/trails" className="nav-link">Trails</Link>
          <Link to="https://icevent.app" className="nav-link">Events</Link>
          <Link to="/status" className="nav-link">Status</Link>
          <Link to="/profile" className="nav-link">Profile</Link>
          <button className="auth-button" onClick={handleAuth}>
            {user ? 'Sign Out' : 'Sign In'}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        <div className="mobile-menu">
          <DropdownMenu user={user} onAuth={handleAuth} />
        </div>
      </div>
    </nav>
  );
};