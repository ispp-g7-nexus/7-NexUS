import React, { useState, useEffect } from "react";
import { fetchWithAuth, API_URL, devLogin } from "../../utils/api";
import "./Events.css";

export function Events() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [participants, setParticipants] = useState<any[]>([]);

    const [newEvent, setNewEvent] = useState({
        name: "",
        description: "",
        photo: "",
        date: "",
        startTime: "",
        endTime: "",
        location: "",
        limit: "",
        labels: "",
    });

    useEffect(() => {
        const init = async () => {
            await devLogin(); // Ensure we have a session cookie
            fetchEvents();
        };
        init();
    }, []);

    const fetchEvents = async () => {
        try {
            const response = await fetchWithAuth(API_URL);
            if (response.ok) {
                const data = await response.json();
                setEvents(data);
            } else {
                console.error("Failed to fetch events:", response.status);
            }
        } catch (error) {
            console.error("Error fetching events:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDetails = async (event: any) => {
        setSelectedEvent(event);
        setParticipants([]);
        try {
            const response = await fetchWithAuth(`${API_URL}${event.id}/participants/`);
            if (response.ok) {
                const data = await response.json();
                setParticipants(data);
            }
        } catch (error) {
            console.error("Error fetching participants:", error);
        }
    };

    const handleJoinEvent = async (eventId: number) => {
        try {
            const response = await fetchWithAuth(`${API_URL}${eventId}/join/`, {
                method: 'POST',
            });

            if (response.ok) {
                alert("¡Te has apuntado al evento!");
                fetchEvents();
            } else {
                const data = await response.json();
                alert(data.detail || "Error al apuntarse al evento");
            }
        } catch (error) {
            console.error("Error joining event:", error);
            alert("Error de conexión");
        }
    };

    const handleLeaveEvent = async (eventId: number) => {
        try {
            const response = await fetchWithAuth(`${API_URL}${eventId}/leave/`, {
                method: 'POST',
            });

            if (response.ok) {
                alert("Te has desapuntado del evento.");
                fetchEvents();
            } else {
                const data = await response.json();
                alert(data.detail || "Error al cancelar la asistencia");
            }
        } catch (error) {
            console.error("Error leaving event:", error);
            alert("Error de conexión");
        }
    };

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await fetchWithAuth(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    title: newEvent.name,
                    description: newEvent.description,
                    start_time: new Date(`${newEvent.date}T${newEvent.startTime}`).toISOString(),
                    end_time: new Date(`${newEvent.date}T${newEvent.endTime}`).toISOString(),
                    location: newEvent.location,
                    tags: newEvent.labels || null,
                    max_participants: newEvent.limit ? parseInt(newEvent.limit) : null,
                    image_url: newEvent.photo || null,
                })
            });

            if (response.ok) {
                alert("Evento creado con éxito.");
                setIsCreateEventOpen(false);
                setNewEvent({
                    name: "", description: "", photo: "", date: "", startTime: "", endTime: "", location: "", limit: "", labels: "",
                });
                fetchEvents();
            } else {
                const data = await response.json();
                alert(`Error: ${JSON.stringify(data.detail || data)}`);
            }
        } catch (error) {
            console.error("Error creating event:", error);
            alert("Error de conexión al crear el evento");
        }
    };

    const now = new Date();
    const upcomingEvents = events.filter(e => new Date(e.end_time) >= now);
    const pastEvents = events.filter(e => new Date(e.end_time) < now);
    const displayedEvents = activeTab === 'upcoming' ? upcomingEvents : pastEvents;

    return (
        <div className="events-container">
            <div className="events-header">
                <h2 className="section-title">Actividades de la Residencia</h2>
                <button
                    className="btn-primary"
                    onClick={() => setIsCreateEventOpen(true)}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    Crear Evento
                </button>
            </div>

            <div className="events-tabs">
                <button
                    className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
                    onClick={() => setActiveTab('upcoming')}
                >
                    Próximas Actividades
                </button>
                <button
                    className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
                    onClick={() => setActiveTab('past')}
                >
                    Eventos Pasados
                </button>
            </div>

            {isCreateEventOpen && (
                <div className="dialog-overlay">
                    <div className="dialog-content">
                        <div className="dialog-header">
                            <h3>Nuevo Evento</h3>
                            <p>Organiza una actividad para compartir con otros residentes.</p>
                        </div>
                        <form onSubmit={handleCreateEvent} className="dialog-form">
                            <div className="form-group">
                                <label htmlFor="name">Nombre del evento</label>
                                <input
                                    id="name"
                                    placeholder="Ej: Tarde de Juegos"
                                    value={newEvent.name}
                                    onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="description">Descripción</label>
                                <textarea
                                    id="description"
                                    placeholder="Explica de qué trata el evento..."
                                    value={newEvent.description}
                                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group half">
                                    <label htmlFor="date">Fecha del evento</label>
                                    <input
                                        id="date"
                                        type="date"
                                        value={newEvent.date}
                                        min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]}
                                        onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group half">
                                    <label htmlFor="startTime">Hora de inicio</label>
                                    <input
                                        id="startTime"
                                        type="time"
                                        value={newEvent.startTime}
                                        onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group half">
                                    <label htmlFor="endTime">Hora de fin</label>
                                    <input
                                        id="endTime"
                                        type="time"
                                        value={newEvent.endTime}
                                        onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group half">
                                    <label htmlFor="limit">Límite de personas</label>
                                    <input
                                        id="limit"
                                        type="number"
                                        placeholder="Sin límite"
                                        value={newEvent.limit}
                                        onChange={(e) => setNewEvent({ ...newEvent, limit: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="location">Lugar</label>
                                <div className="input-with-icon">
                                    <span>📍</span>
                                    <input
                                        id="location"
                                        placeholder="Ej: Sala Común"
                                        value={newEvent.location}
                                        onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="photo">URL de la foto</label>
                                <div className="input-with-icon">
                                    <span>🖼️</span>
                                    <input
                                        id="photo"
                                        placeholder="https://..."
                                        value={newEvent.photo}
                                        onChange={(e) => setNewEvent({ ...newEvent, photo: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="labels">Etiquetas (separadas por comas)</label>
                                <div className="input-with-icon">
                                    <span>🏷️</span>
                                    <input
                                        id="labels"
                                        placeholder="Ej: Juegos, Relax, Social"
                                        value={newEvent.labels}
                                        onChange={(e) => setNewEvent({ ...newEvent, labels: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="dialog-footer">
                                <button type="button" className="btn-secondary" onClick={() => setIsCreateEventOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary submit-btn">Publicar Evento</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedEvent && (
                <div className="dialog-overlay" onClick={() => setSelectedEvent(null)}>
                    <div className="dialog-content event-details-modal" onClick={e => e.stopPropagation()}>
                        <div className="details-header-image">
                            <img src={selectedEvent.image_url || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=400"} alt={selectedEvent.title} />
                            <div className="close-btn" onClick={() => setSelectedEvent(null)}>✕</div>
                        </div>
                        <div className="details-body">
                            <h2>{selectedEvent.title}</h2>
                            <p className="details-host">Organizado por {selectedEvent.host?.first_name || 'Usuario'} {selectedEvent.host?.last_name || ''}</p>

                            <div className="details-info-row">
                                <span>🗓️ {new Date(selectedEvent.start_time).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} - {new Date(selectedEvent.end_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                                <span>📍 {selectedEvent.location}</span>
                            </div>

                            <div className="details-description">
                                <h3>Acerca de este evento</h3>
                                <p>{selectedEvent.description}</p>
                            </div>

                            <div className="details-participants">
                                <h3>Asistentes ({selectedEvent.participants_count}{selectedEvent.max_participants ? `/${selectedEvent.max_participants}` : ''})</h3>
                                {participants.length > 0 ? (
                                    <ul className="participants-list">
                                        {participants.map((p: any, idx) => (
                                            <li key={idx} className="participant-item">
                                                <div className="participant-avatar">{p.user?.first_name?.charAt(0) || 'U'}</div>
                                                <span>{p.user?.first_name} {p.user?.last_name}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="no-participants">Aún no hay asistentes o están cargando...</p>
                                )}
                            </div>
                        </div>
                        <div className="dialog-footer" style={{ padding: '0 24px 24px 24px', margin: 0 }}>
                            {new Date(selectedEvent.end_time) < now ? (
                                <p className="no-participants" style={{ width: '100%', textAlign: 'center' }}>Este evento ya ha finalizado.</p>
                            ) : selectedEvent.is_joined ? (
                                <button className="btn-leave" style={{ width: '100%' }} onClick={async () => { await handleLeaveEvent(selectedEvent.id); setSelectedEvent(null); }}>Desapuntarme</button>
                            ) : (
                                <button className="btn-join" style={{ width: '100%', justifyContent: 'center' }} onClick={async () => { await handleJoinEvent(selectedEvent.id); setSelectedEvent(null); }}>Apuntarme al Evento</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="events-list">
                {loading ? (
                    <p>Cargando eventos...</p>
                ) : displayedEvents.length === 0 ? (
                    <p>{activeTab === 'upcoming' ? "No hay eventos próximos." : "No hay eventos pasados."}</p>
                ) : (
                    displayedEvents.map((event) => (
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
                            isPast={activeTab === 'past'}
                            onJoin={handleJoinEvent}
                            onLeave={handleLeaveEvent}
                            onClick={() => handleOpenDetails(event)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function CommunityEvent({
    id,
    title,
    date,
    attendees,
    image,
    tags,
    isJoined,
    isPast,
    onJoin,
    onLeave,
    onClick,
}: any) {
    const displayTag = tags ? tags.split(',')[0].trim() : "Social";

    return (
        <div className="event-card clickable-card" onClick={onClick}>
            <div className="event-image-container">
                <img
                    src={image}
                    alt={title}
                    className="event-image"
                />
                <div className="event-badge">{displayTag}</div>
            </div>
            <div className="event-content">
                <h3 className="event-title">{title}</h3>
                <p className="event-date">{date}</p>
                <div className="event-footer" onClick={(e) => e.stopPropagation()}>
                    <div className="event-attendees">
                        <span className="attendees-text">
                            +{attendees} {isPast ? 'fueron' : 'van'}
                        </span>
                    </div>
                    {isPast ? (
                        <div className="event-actions">
                            <button className="btn-joined" disabled style={{ backgroundColor: '#f1f5f9', color: '#94a3b8', border: 'none' }}>
                                Finalizado
                            </button>
                        </div>
                    ) : isJoined ? (
                        <div className="event-actions">
                            <button
                                className="btn-joined"
                                disabled
                            >
                                ✓ Apuntado
                            </button>
                            <button
                                className="btn-leave"
                                onClick={() => onLeave(id)}
                                title="Desapuntarme"
                            >
                                ✕
                            </button>
                        </div>
                    ) : (
                        <button
                            className="btn-join"
                            onClick={() => onJoin(id)}
                        >
                            Apuntarme
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
