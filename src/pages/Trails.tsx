import React, { useState, useEffect } from 'react';
import { User, authSubscribe, listDocs } from "@junobuild/core";
import { Navbar } from '../components/Navbar';
import { Spinner } from '../components/Spinner';
import './Trails.css';
import { Trail } from '../types/Trail'



export const Trails = () => {
  const [user, setUser] = useState<User | null>(null);
  const [trails, setTrails] = useState<Trail[]>([]);
  const DEFAULT_TRAIL_IMAGE = 'https://orkad-xyaaa-aaaal-ai7ta-cai.icp0.io/logos/alltracks_hero.png';
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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

  // const fetchTrails = async () => {
  //   setIsLoading(true);
  //   const { items } = await listDocs<Trail>({
  //     collection: "trails"
  //   });

  //   const formattedTrails = items.map(doc => ({
  //     id: doc.key,
  //     name: doc.data.name,
  //     length: doc.data.length,
  //     elevationGain: doc.data.elevationGain,
  //     difficulty: doc.data.difficulty,
  //     description: doc.data.description,
  //     imageUrl: doc.data.imageUrl || DEFAULT_TRAIL_IMAGE,
  //     fileRef: doc.data.fileRef

  //   }));

  //   setTrails(formattedTrails);
  //   setIsLoading(false);
  // };
  const fetchTrails = async () => {
    setIsLoading(true);
    
    const query = `{
      transactions(
        tags: [
          { name: "App-Name", values: ["AllTracks"] },
          { name: "File-Type", values: ["trail"] },
        ]
        first: 100
      ) {
        edges {
          node {
            id
            tags {
              name
              value
            }
            block {
              timestamp
            }
          }
        }
      }
    }`;
  
    const response = await fetch('https://arweave.net/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query })
    });
  
    const result = await response.json();
    const formattedTrails = result.data.transactions.edges.map((edge: any) => {
      const tags = edge.node.tags.reduce((acc: any, tag: any) => {
        acc[tag.name] = tag.value;
        return acc;
      }, {});
  
      return {
        id: edge.node.id,
        name: tags['Trail-Name'] || 'Unnamed Trail',
        length: Number(tags['Length']) || 0,
        elevationGain: Number(tags['Elevation']) || 0,
        difficulty: tags['Difficulty'] || 'moderate',
        description: tags['Description'] || '',
        imageUrl: DEFAULT_TRAIL_IMAGE,
        fileRef: `https://arweave.net/${edge.node.id}`
      };
    });
  
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
                    <a
                      href={trail.fileRef}
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