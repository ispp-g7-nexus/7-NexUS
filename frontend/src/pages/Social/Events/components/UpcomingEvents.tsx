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
    if (loading) return <p className="text-center text-gray-500 py-10">Cargando eventos...</p>;
    if (events.length === 0) {
        return (
            <div className="bg-white text-card-foreground p-8 rounded-xl border border-gray-200 text-center shadow-sm">
                <p className="text-gray-500">No hay próximas actividades programadas en este momento.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    canJoin={event.can_join}
                    isPast={false}
                    onJoin={handleJoinEvent}
                    onLeave={handleLeaveEvent}
                    onClick={() => handleOpenDetails(event)}
                />
            ))}
        </div>
    );
}
