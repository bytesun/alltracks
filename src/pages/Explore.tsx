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
        <h1>Plan with the map, not a menu of modules.</h1>
        <p>
          Trails, useful spots, and recent field conditions now start from one place. The underlying
          tools stay separate for now while AllTracks moves toward a unified multi-layer map.
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

      <section className="explore-next-step">
        <span className="material-icons" aria-hidden="true">layers</span>
        <div>
          <strong>Next UX step</strong>
          <p>Combine these sources into one map with switchable Trails, Spots, and Conditions layers.</p>
        </div>
      </section>
    </main>
  );
};

export default Explore;
