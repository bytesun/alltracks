import React from 'react';
import { User } from "@junobuild/core";
import { Navbar } from './Navbar';

interface TrackHeaderProps {
  user: User | null;
  onAuth: () => Promise<void>;
  locationError: string;
}

export const TrackHeader: React.FC<TrackHeaderProps> = ({
  user,
  onAuth,
  locationError
}) => {
  return (
    <header className="App-header">
      <Navbar  />
      {locationError && (
        <div className="location-error">
          {locationError}
        </div>
      )}
    </header>
  );
};
