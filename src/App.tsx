import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainApp  from './MainApp';

import { Trails } from './pages/Trails';
import { Events } from './pages/Events';
import { Track } from './pages/Track';
import { Event } from './pages/Event';
import { Live } from './pages/Live';
import { Status } from './pages/Status';
import { Profile } from './pages/Profile';
import { Guide } from './pages/Guide';
import { GroupPage } from './pages/GroupPage';
import { UserPage } from './pages/UserPage';
import { EventPage } from './pages/EventPage';
import { authSubscribe, User } from "@junobuild/core";

import { NotificationProvider } from './context/NotificationContext';
import { StatsProvider } from './context/StatsContext';
export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = authSubscribe((user: User | null) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  return (
    <NotificationProvider>
      <StatsProvider>
        <Routes>
          <Route path="/" element={<MainApp/>} />
          <Route path="/trails" element={<Trails />} />
          <Route path="/events" element={<Events />} />
          <Route path="/track/:trackId" element={<Track />} />
          <Route path="/event/:eventId" element={<EventPage />} />
          <Route path="/live/:liveId" element={<Live />} />
          <Route path="/status" element={<Status />} />
          <Route path="/profile" element={<Profile user={user} />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/group/:groupId" element={<GroupPage />} />
          <Route path="/user/:userKey" element={<UserPage />} />
        </Routes>
      </StatsProvider>
    </NotificationProvider>
  );
};
export default App;