import React, { useState, useRef, useEffect } from 'react';
import './DropdownMenu.css';

export const DropdownMenu = () => {
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
            <li>
              <a href="#trails">Trails</a>
            </li>
            <li>
              <a href="#login">Login</a>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};