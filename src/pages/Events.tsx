import React, { useState, useEffect } from 'react';
import { User, authSubscribe, signIn, signOut } from "@junobuild/core";
import { Navbar } from '../components/Navbar';
import { CreateEventModal } from '../components/CreateEventModal';
import './Events.css';
import { setDoc, listDocs } from "@junobuild/core";
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
  const [user, setUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const unsubscribe = authSubscribe((user: User | null) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, []);
  const handleAuth = async (): Promise<void> => {
    if (user) {
      await signOut();
    } else {
      await signIn();
    }
  };
  const fetchEvents = async () => {
    const eventsList = await listDocs({
      collection: "events"
    });
    setEvents(eventsList.items.map(doc => doc.data as Event));
  };

  const handleCreateEvent = async (formData: any) => {
    await setDoc({
      collection: "events",
      doc: {
        key: formData.eventId,
        data: formData
      }
    });
    setShowCreateModal(false);
    fetchEvents();
  };

  return (
    <div>
      <Navbar user={user} onAuth={handleAuth} />
      <div className="events-container">
        <header className="events-header">
          <h1>Hiking Events</h1>
          <button
            className="create-event-btn"
            onClick={() => setShowCreateModal(true)}
            disabled={!user}
          >
            Create Event
          </button>
        </header>

        <div className="events-list">
          {events.map(event => (
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
                  <span>🕒 {new Date(event.time).toLocaleTimeString()}</span>
                  <span>🏃‍♂️ {event.trail}</span>
                </div>
                <p>{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {showCreateModal && <CreateEventModal onClose={() => setShowCreateModal(false)} onSubmit={handleCreateEvent} />}
    </div>
  );
};