import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './DropdownMenu.css';
import { useGlobalContext } from './Store';

interface DropdownMenuProps {
  isAuthed: boolean;
  onAuth: () => Promise<void>;
}

export const DropdownMenu = ({ isAuthed, onAuth }: DropdownMenuProps) => {
  const { state: { principal } } = useGlobalContext();
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

  return (
    <div className="nav-dropdown-container" ref={dropdownRef}>
      <button
        className="nav-menu-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isOpen}
      >
        ☰
      </button>
      {isOpen && (
        <div className="nav-dropdown-menu">
          <ul>
            <li onClick={() => goTo('/')}>
              <span className="material-icons">radio_button_checked</span>
              Record
            </li>
            <li onClick={() => goTo('/explore')}>
              <span className="material-icons">explore</span>
              Explore
            </li>
            <li onClick={() => goTo('/trackathons')}>
              <span className="material-icons">flag</span>
              Challenges
            </li>
            {isAuthed && principal && (
              <li onClick={() => goTo(`/tracks/${principal}`)}>
                <span className="material-icons">history</span>
                History
              </li>
            )}
            {isAuthed && (
              <li onClick={() => goTo('/profile')}>
                <span className="material-icons">person</span>
                Me
              </li>
            )}
            {isAuthed && <li onClick={() => {
              setIsOpen(false);
              onAuth();
            }}>
              <span className="material-icons">logout</span>
              Sign Out
            </li>}

            {!isAuthed && <li onClick={() => {
              setIsOpen(false);
              onAuth();
            }}>
              <span className="material-icons">login</span>
              Sign In
            </li>}
          </ul>
        </div>
      )}
    </div>
  );
};
