import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Navbar.css';
import { User } from "@junobuild/core";
import { DropdownMenu } from './DropdownMenu';

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
      <DropdownMenu user={user} onAuth={onAuth} />
    </nav>
  );
};
