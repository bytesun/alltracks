import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Navbar.css';
import { User } from "@junobuild/core";
import { DropdownMenu } from './DropdownMenu';
import { Link } from 'react-router-dom';

interface NavbarProps {
  user: User | null;
  onAuth: () => Promise<void>;
}

export const Navbar = ({ user, onAuth }: NavbarProps) => {
  const navigate = useNavigate();

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
      <DropdownMenu user={user} onAuth={onAuth} />
    </nav>
  );
};
