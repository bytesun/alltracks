import React from 'react';
import { User } from "@junobuild/core";

interface AuthHandlerProps {
  user: User | null;
  onAuth: () => Promise<void>;
}

export const AuthHandler: React.FC<AuthHandlerProps> = ({ user, onAuth }) => {
  return (
    <button 
      className="auth-button" 
      onClick={onAuth}
    >
      {user ? 'Sign Out' : 'Sign In'}
    </button>
  );
};
