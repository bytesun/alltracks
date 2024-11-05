import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainApp  from './MainApp';
import { Home } from './pages/Home';
import { Trails } from './pages/Trails';
import { Events } from './pages/Events';
import { User } from './types/auth';
import { Track } from './pages/Track';

export const App: React.FC = () => {

  return (
    <Routes>
      <Route path="/" element={<MainApp/>} />
      <Route path="/trails" element={<Trails />} />
      <Route path="/events" element={<Events />} />
      <Route path="/track/:trackId" element={<Track />} />
    </Routes>
  );
};
export default App;