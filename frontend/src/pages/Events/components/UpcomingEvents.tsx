import React from 'react';
import { CommunityEvent } from './CommunityEvent';

export function UpcomingEvents({
    events,
    loading,
    handleJoinEvent,
    handleLeaveEvent,
    handleOpenDetails
}: {
    events: any[];
    loading: boolean;
    handleJoinEvent: (id: number) => Promise<void>;
    handleLeaveEvent: (id: number) => Promise<void>;
    handleOpenDetails: (event: any) => void;
}) {
    if (loading) return <p>Cargando eventos...</p>;
    if (events.length === 0) return <p>No hay eventos próximos.</p>;

    return (
        <div className="events-list">
            {events.map((event: any) => (
                <CommunityEvent
                    key={event.id}
                    id={event.id}
                    title={event.title}
                    date={new Date(event.start_time).toLocaleString('es-ES', {
                        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                    attendees={event.participants_count}
                    image={event.image_url || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=400"}
                    tags={event.tags}
                    isJoined={event.is_joined}
                    isPast={false}
                    onJoin={handleJoinEvent}
                    onLeave={handleLeaveEvent}
                    onClick={() => handleOpenDetails(event)}
                />
            ))}
        </div>
    );
}
