import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useICEvent } from '../components/Store';
import moment from 'moment-timezone';
import '../styles/GroupEvents.css';

interface GroupEventsProps {
    groupId: string;
}

export const GroupEvents: React.FC<GroupEventsProps> = ({ groupId }) => {
    const icevent = useICEvent();
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        setIsLoading(true);

        const now = new Date();
        const start = BigInt(Math.floor(now.getTime() / 1000));
        const end = BigInt(Math.floor(new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999).getTime() / 1000));

        const result = await icevent.getCalendarEvents(BigInt(groupId), start, end, BigInt(1));
        const sortedEvents = result.sort((a, b) => Number(a.start - b.start));

        setEvents(sortedEvents);
        setIsLoading(false);
    };
    return (
        <section className="group-events">

            <div className="events-grid">
                {events.map(event => (
                    <div key={event.id} className="event-card">
                        <div className="event-date">
                            <span className="day">{moment.unix(parseInt(event.start)).format('DD')}</span>
                            <span className="month">{moment.unix(parseInt(event.start)).format('MMM')}</span>
                        </div>

                        <div className="event-content">
                            <h3>{event.title}</h3>
                            <div className="event-location">
                                <span className="material-icons">place</span>
                                {event.location["url"] ? (
                                    <a href={event.location["url"]} target="_blank" rel="noopener noreferrer" className="location-link">
                                        {event.location["url"]}
                                    </a>
                                ) : (
                                    <a href={`https://maps.google.com/?q=${event.location["address"]}`} target="_blank" rel="noopener noreferrer" className="location-link">
                                        {event.location["address"]}
                                    </a>
                                )}
                            </div>

                            <div className="event-time">
                                <span className="material-icons">schedule</span>
                                {moment.unix(parseInt(event.start)).format("MMM DD , hh:mm A")}
                            </div>
                            <p className="event-description">{event.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
