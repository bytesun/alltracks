import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainApp  from './MainApp';
import { Home } from './pages/Home';
import { Trails } from './pages/Trails';
import { Events } from './pages/Events';
import { Track } from './pages/Track';
import { Event } from './pages/Event';

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainApp/>} />
      <Route path="/trails" element={<Trails />} />
      <Route path="/events" element={<Events />} />
      <Route path="/track/:trackId" element={<Track />} />
      <Route path="/event/:eventId" element={<Event />} />
    </Routes>
  );
};
export default App;