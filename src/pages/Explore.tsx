import React from 'react';
import { Link } from 'react-router-dom';
import './Explore.css';

const EXPLORE_SECTIONS = [
  {
    to: '/trails',
    icon: 'terrain',
    title: 'Trails',
    description: 'Find routes by difficulty, distance, route type, and what is visible on the map.',
    action: 'Browse trails',
  },
  {
    to: '/spots',
    icon: 'place',
    title: 'Spots',
    description: 'Discover useful outdoor places, access points, viewpoints, launches, and shared locations.',
    action: 'Explore spots',
  },
  {
    to: '/status',
    icon: 'warning_amber',
    title: 'Conditions',
    description: 'See recent nearby incident reports and field updates before or during an outing.',
    action: 'Check conditions',
  },
];

const Explore: React.FC = () => {
  return (
    <main className="explore-page">
      <section className="explore-hero">
        <p className="explore-eyebrow">Explore outdoors</p>
        <h1>Trails, spots, and field conditions in one place.</h1>
        <p>
          Find a route, check useful places nearby, and review recent field reports before you head out.
        </p>
      </section>

      <section className="explore-grid" aria-label="Explore AllTracks">
        {EXPLORE_SECTIONS.map((section) => (
          <Link key={section.to} to={section.to} className="explore-card">
            <span className="material-icons explore-card__icon" aria-hidden="true">{section.icon}</span>
            <div>
              <h2>{section.title}</h2>
              <p>{section.description}</p>
            </div>
            <span className="explore-card__action">
              {section.action}
              <span className="material-icons" aria-hidden="true">arrow_forward</span>
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
};

export default Explore;
