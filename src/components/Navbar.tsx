import React,{useEffect,useState} from 'react';
import {Navigate, useNavigate } from 'react-router-dom';
import './Navbar.css';
import { User } from "@junobuild/core";
import { DropdownMenu } from './DropdownMenu';
import { Link } from 'react-router-dom';
import { authSubscribe, signIn, signOut } from '@junobuild/core';
export const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = authSubscribe((user: User | null) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async () => {
    if (user) {
      await signOut();
    } else {
      await signIn({
         derivationOrigin:"https://oneblock.page", 
        maxTimeToLive: BigInt(24 * 60 * 60 * 1000 * 1000 * 1000) //24 hours
      });
      //navigate('/profile');
    }
  };
  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate('/')}>        
        <span className="brand-text">AllTracks</span>
      </div>
      <div className="nav-items">
        <Link to="/status" className="nav-link">
          <span className="material-icons">track_changes</span>
          Status
        </Link>

        </div>
      <DropdownMenu user={user} onAuth={handleAuth} />
    </nav>
  );
};
