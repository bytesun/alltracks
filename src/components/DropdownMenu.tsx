import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DropdownMenu.css';

export const DropdownMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

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
            <li>
              <button onClick={() => {
                navigate('/trails');
                setIsOpen(false);
              }}>
                Trails
              </button>
            </li>
            <li>
              <button onClick={() => {
                navigate('/login');
                setIsOpen(false);
              }}>
                Login
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};