import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainApp  from './MainApp';

import { Trails } from './pages/Trails';
import { Events } from './pages/Events';
import { TrackPage } from './pages/Track';
import { TracksPage } from './pages/TracksPage';
import  CheckIn  from './pages/CheckIn';

import { Live } from './pages/Live';
import { Status } from './pages/Status';
import { Profile } from './pages/Profile';
import { Guide } from './pages/Guide';
import { GroupPage } from './pages/GroupPage';
import { UserPage } from './pages/UserPage';
import { EventPage } from './pages/EventPage';

import { NotificationProvider } from './context/NotificationContext';
import { StatsProvider } from './context/StatsContext';
import Store from './components/Store';
import { Layout } from './components/Layout';

function App() {
  return (
    <NotificationProvider>
      <StatsProvider>
        <Store>
          
            <Layout>
              <Routes>
                <Route path="/" element={<MainApp />} />
                <Route path="/trails" element={<Trails />} />
                <Route path="/checkin" element={<CheckIn />} />
                <Route path="/events" element={<Events />} />
                <Route path="/track/:trackId" element={<TrackPage />} />
                <Route path="/event/:eventId" element={<EventPage />} />
                <Route path="/live/:liveId" element={<Live />} />
                <Route path="/status" element={<Status />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/guide" element={<Guide />} />
                <Route path="/group/:groupId" element={<GroupPage />} />
                <Route path="/user/:userKey" element={<UserPage />} />
                <Route path="/tracks/:userId" element={<TracksPage />} />
              </Routes>
            </Layout>
          
        </Store>
      </StatsProvider>
    </NotificationProvider>
  );
}export default App;