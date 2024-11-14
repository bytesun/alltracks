import React, { createContext, useContext, useState } from 'react';
import { ProfileSettings } from '../types/profileSettings';

interface StatsContextType {
  settings: ProfileSettings | null;
  updateSettings: (newStats: ProfileSettings) => void;
}

const StatsContext = createContext<StatsContextType | undefined>(undefined);

export const StatsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<ProfileSettings>({
    storageId: '',
    trackPointCollection: '',
    trackFileCollection: '',
    inboxCollection: '',
    inboxAttachmentCollection: ''
  });

  const updateSettings = (newStats: ProfileSettings) => {
    setSettings(newStats);
  };

  return (
    <StatsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </StatsContext.Provider>
  );
};

export const useStats = () => {
  const context = useContext(StatsContext);
  if (!context) {
    throw new Error('useStats must be used within a StatsProvider');
  }
  return context;
};
