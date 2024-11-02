import React from 'react';
import './Events.css';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  trail: string;
  participants: number;
  maxParticipants: number;
  description: string;
  imageUrl: string;
}

const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Skyline ridge',
    date: '2024-11-3',
    time: '09:00',
    location: 'Sea to sky',
    trail: 'Skyline ridge',
    participants: 3,
    maxParticipants: 3,
    description: '',
    imageUrl: 'https://www.seatoskygondola.com/site/assets/files/10307/seatoskygondola-153.800x597.jpg'
  }
];

export const Events = () => {
  return (
    <div className="events-container">
      <header className="events-header">
        <h1>Hiking Events</h1>
        <button className="create-event-btn">Create Event</button>
      </header>
      
      <div className="events-list">
        {mockEvents.map(event => (
          <div key={event.id} className="event-card">
            <div className="event-image">
              <img src={event.imageUrl} alt={event.title} />
              <div className="event-date">
                <span>{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            </div>
            
            <div className="event-details">
              <h2>{event.title}</h2>
              <div className="event-info">
                <span>🕒 {event.time}</span>
                <span>📍 {event.location}</span>
                <span>🏃‍♂️ {event.trail}</span>
              </div>
              <p>{event.description}</p>
              <div className="event-footer">
                <div className="participants">
                  {event.participants}/{event.maxParticipants} participants
                  <div className="progress-bar">
                    <div 
                      className="progress" 
                      style={{width: `${(event.participants/event.maxParticipants) * 100}%`}}
                    ></div>
                  </div>
                </div>
                
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};