import React, { useState, useEffect } from 'react';

import { Navbar } from '../components/Navbar';
import { Spinner } from '../components/Spinner';
import './Trails.css';
import { Trail } from '../types/Trail'
import { arweave, arweaveGateway } from '../utils/arweave';
import { useAlltracks } from '../components/Store';
import { parseTrails } from '../utils/trailUtils';


export const Trails = () => {

  const alltracks = useAlltracks();
  const [trails, setTrails] = useState<Trail[]>([]);
  
  const DEFAULT_TRAIL_IMAGE = 'https://orkad-xyaaa-aaaal-ai7ta-cai.icp0.io/logos/alltracks_hero.png';
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Filter trails based on selected difficulty
  const filteredTrails = selectedDifficulty
    ? trails.filter(trail => trail.difficulty === selectedDifficulty)
    : trails;

  useEffect(() => {
    fetchTrails();
  }, [selectedDifficulty]);

  const fetchTrails = async () => {
    setIsLoading(true);
    
   const result = await alltracks.getTrails({"ttype":{"tloop":null}});
    const formattedTrails = parseTrails(result);
    setTrails(formattedTrails);
    setIsLoading(false);
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
        {isLoading ? (
          <div className="loading-container">
            <Spinner size="large" />
          </div>
        ) : (
          <div className="trails-grid">
            {filteredTrails.map(trail => (
              <div key={trail.id} className="trail-card">
                <div className="trail-image">
                  <img src={trail.photos.length > 0 ? trail.photos[0] : DEFAULT_TRAIL_IMAGE} alt={trail.name} />
                  <span className={`difficulty-badge ${trail.difficulty}`}>
                    {trail.difficulty}
                  </span>
                </div>
                <div className="trail-info">
                  <h2>{trail.name}</h2>
                  <div className="trail-stats">
                    <span>{trail.distance} km</span>
                    <span>{trail.duration} hours</span>
                    <span>{trail.elevationGain} m </span>
                    <a
                      href={arweaveGateway +'/'+ trail.trailfile}
                      download
                      className="download-link"
                    >
                      <span className="material-icons">download</span>
                    </a>
                  </div>
                  <p>{trail.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};