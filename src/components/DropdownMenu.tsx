import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DropdownMenu.css';
import { IdentityKitProvider, ConnectWallet } from "@nfid/identitykit/react"
export const DropdownMenu = () => {
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
              navigate('/trails');
              setIsOpen(false);
            }}>
              Trails
            </li>
            <li onClick={() => {
              navigate('/events');
              setIsOpen(false);
            }}>
              Events
            </li>
            <li>
            <ConnectWallet />
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};