import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useICEvent } from '../components/Store';
import moment from 'moment-timezone';

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
        const start = BigInt(Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000));
        const end = BigInt(Math.floor(new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime() / 1000));
        console.log('start:', start);
        console.log('end:', end)

        const result = await icevent.getCalendarEvents(BigInt(groupId), start, end, BigInt(1));

        setEvents(result)
        setIsLoading(false);
    };

    return (
        <section className="group-events">
            <div className="events-list">
                {events.map(event => (
                    <div key={event.id} className="event-list-item">
                        <div className="event-info">
 
                            <h3> {moment.unix(parseInt(event.start)).format("YYYY-MM-DD hh:mm")} - {event.title}</h3>

                            <p>{event.description}</p>
                            
                        </div>

                    </div>
                ))}
            </div>
        </section>
    );
};
