import React,{useState,useEffect} from 'react';
import {User, authSubscribe, signIn,signOut} from "@junobuild/core";
import { Navbar } from '../components/Navbar';
import './Trails.css';


interface Trail {
  id: string;
  name: string;
  distance: number;
  elevation: number;
  difficulty: 'easy' | 'moderate' | 'hard';
  description: string;
  imageUrl: string;
}

const mockTrails: Trail[] = [
  {
    id: '1',
    name: 'Grouse Grind',
    distance: 2.9,
    elevation: 853,
    difficulty: 'hard',
    description: 'Known as Mother Nature\'s Stairmaster, this is a steep climb up Grouse Mountain.',
    imageUrl: 'https://www.vancouvertrails.com/images/photos/grouse-grind-3.jpg'
  },
  {
    id: '2',
    name: 'Lynn Loop',
    distance: 5.1,
    elevation: 185,
    difficulty: 'easy',
    description: 'A scenic trail in Lynn Canyon Park following Lynn Creek.',
    imageUrl: 'https://images.alltrails.com/eyJidWNrZXQiOiJhc3NldHMuYWxsdHJhaWxzLmNvbSIsImtleSI6InVwbG9hZHMvcGhvdG8vaW1hZ2UvNDE0NjYyNjYvNWU4NmY4ZmFjNzY5Y2EwMjM4YTU2YzE5ZTUxZjEzOTIuanBnIiwiZWRpdHMiOnsidG9Gb3JtYXQiOiJ3ZWJwIiwicmVzaXplIjp7IndpZHRoIjoyMDQ4LCJoZWlnaHQiOjIwNDgsImZpdCI6Imluc2lkZSJ9LCJyb3RhdGUiOm51bGwsImpwZWciOnsidHJlbGxpc1F1YW50aXNhdGlvbiI6dHJ1ZSwib3ZlcnNob290RGVyaW5naW5nIjp0cnVlLCJvcHRpbWlzZVNjYW5zIjp0cnVlLCJxdWFudGlzYXRpb25UYWJsZSI6M319fQ=='
  }
];

export const Trails = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = authSubscribe((user: User | null) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async (): Promise<void> => {
    if (user) {
      await signOut();
    } else {
      await signIn();
    }
  };
  return (
    <div>
      <Navbar user={user} onAuth={handleAuth} />
    <div className="trails-container">
      <header className="trails-header">
        <h1>Hiking Trails</h1>
        <div className="trails-filters">
          <select>
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="moderate">Moderate</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </header>
      <div className="trails-grid">
        {mockTrails.map(trail => (
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
                <span>{trail.distance} km</span>
                <span>{trail.elevation} m elevation</span>
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