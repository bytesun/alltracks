import React,{useState,useEffect} from 'react';
import {User, authSubscribe, listDocs} from "@junobuild/core";
import { Navbar } from '../components/Navbar';
import './Trails.css';


interface Trail {
  id: string;
  name: string;
  length: number;
  elevationGain: number;
  difficulty: 'easy' | 'moderate' | 'hard';
  description: string;
  imageUrl: string;
}

interface TrailData {
  name: string;
  distance: number;
  elevation: number;
  difficulty: 'easy' | 'moderate' | 'hard';
  description: string;
  imageUrl: string;
}


export const Trails = () => {
  const [user, setUser] = useState<User | null>(null);
  const [trails, setTrails] = useState<Trail[]>([]);
  const DEFAULT_TRAIL_IMAGE = 'https://orkad-xyaaa-aaaal-ai7ta-cai.icp0.io/logos/alltracks_hero.png';
  const [selectedDifficulty, setSelectedDifficulty] = useState('');

  // Filter trails based on selected difficulty
  const filteredTrails = selectedDifficulty 
    ? trails.filter(trail => trail.difficulty === selectedDifficulty)
    : trails;

  useEffect(() => {
    const unsubscribe = authSubscribe((user: User | null) => {
      setUser(user);
      
    });
    fetchTrails();
    return () => unsubscribe();
  }, []);
  const fetchTrails = async () => {
    const { items } = await listDocs<Trail>({
      collection: "trails"
    });
    console.log(items);
    const formattedTrails = items.map(doc => ({
      id: doc.data.id,
      name: doc.data.name,
      length: doc.data.length,
      elevationGain: doc.data.elevationGain,
      difficulty: doc.data.difficulty,
      description: doc.data.description,
      imageUrl: doc.data.imageUrl|| DEFAULT_TRAIL_IMAGE

    }));

    setTrails(formattedTrails);
  };

  return (
    <div>
      <Navbar />
      <div className="trails-container">
        <header className="trails-header">
          <h1>Hiking Trails</h1>
          <div className="trails-filters">
          <select 
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </header>
        <div className="trails-grid">
          {filteredTrails.map(trail => (
            <div key={trail.id} className="trail-card">
              <div className="trail-image">
                <img src={trail.imageUrl} alt={trail.name} />
                <span className={`difficulty-badge ${trail.difficulty}`}>
                  {trail.difficulty}
                </span>
              </div>
              <div className="trail-info">
                <h2>{trail.name}</h2>
                <div className="trail-stats">
                  <span>{trail.length} km</span>
                  <span>{trail.elevationGain} m </span>
                </div>
                <p>{trail.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};