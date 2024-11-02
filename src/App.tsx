import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import  MainApp  from './MainApp';
import { Trails } from './pages/Trails';
import { Events } from "./pages/Events";

function App() {
  
  return (
    <Routes>
      <Route path="/" element={<MainApp />} />
      <Route path="/trails" element={<Trails />} />
      <Route path="/events" element={<Events />} />
    </Routes>
  );
}

export default App;