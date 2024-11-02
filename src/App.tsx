import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import  MainApp  from './MainApp';
import { Trails } from './pages/Trails';
import { Events } from "./pages/Events";
import { TrackView } from "./pages/TrackView";

function App() {
  
  return (
    <Routes>
      <Route path="/" element={<MainApp />} />
      <Route path="/tracks" element={<Trails />} />
      <Route path="/activities" element={<Events />} />
      <Route path="/track/:trackId" element={<TrackView />} />
    </Routes>
  );
}

export default App;