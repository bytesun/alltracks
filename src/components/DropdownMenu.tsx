import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DropdownMenu.css';

interface DropdownMenuProps {
  isAuthed: boolean;
  onAuth: () => Promise<void>;
}

export const DropdownMenu = ({ isAuthed, onAuth }: DropdownMenuProps) => {
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

  const goTo = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const menuItem = (path: string, icon: string, label: string) => (
    <li>
      <button type="button" onClick={() => goTo(path)}>
        <span className="material-icons">{icon}</span>
        {label}
      </button>
    </li>
  );

  return (
    <div className="nav-dropdown-container" ref={dropdownRef}>
      <button
        className="nav-menu-button"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <span className="material-icons">menu</span>
      </button>
      {isOpen && (
        <div className="nav-dropdown-menu" role="menu">
          <ul>
            {menuItem('/', 'radio_button_checked', 'Record')}
            {menuItem('/explore', 'explore', 'Explore')}
            {menuItem('/trackathons', 'flag', 'Challenges')}
            {menuItem('/history', 'history', 'History')}
            {isAuthed && menuItem('/profile', 'person', 'Me')}
            <li>
              <button
                type="button"
                onClick={async () => {
                  setIsOpen(false);
                  await onAuth();
                }}
              >
                <span className="material-icons">{isAuthed ? 'logout' : 'login'}</span>
                {isAuthed ? 'Sign Out' : 'Sign In'}
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};
