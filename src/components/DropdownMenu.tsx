import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DropdownMenu.css';
import { User } from "@junobuild/core";


interface DropdownMenuProps {
  user: User | null;
  onAuth: () => Promise<void>;
}

export const DropdownMenu = ({ user, onAuth }: DropdownMenuProps) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="dropdown-container" ref={dropdownRef}>
      <button className="menu-button" onClick={() => setIsOpen(!isOpen)}>
        ☰
      </button>
      {isOpen && (
        <div className="dropdown-menu">
          <ul>
            <li onClick={() => {
              navigate('/tracks');
              setIsOpen(false);
            }}>
              Tracks
            </li>
            <li onClick={() => {
              navigate('/activities');
              setIsOpen(false);
            }}>
              Activities
            </li>
            <li onClick={onAuth}>
              {user ? 'Sign Out' : 'Sign In'}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};