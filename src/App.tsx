import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import  MainApp  from './MainApp';
import { Trails } from './pages/Trails';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainApp />} />
      <Route path="/trails" element={<Trails />} />
    </Routes>
  );
}

export default App;