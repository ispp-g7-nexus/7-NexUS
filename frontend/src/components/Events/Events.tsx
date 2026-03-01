import React, { useState, useEffect } from "react";
import { fetchWithAuth, API_URL } from "../../utils/api";
import "./Events.css";

export function Events() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);

    const [newEvent, setNewEvent] = useState({
        name: "",
        description: "",
        photo: "",
        dateTime: "",
        location: "",
        limit: "",
        labels: "",
        preRegistered: "",
    });

    useEffect(() => {
        fetchEvents();
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
                    start_time: new Date(newEvent.dateTime).toISOString(),
                    end_time: new Date(new Date(newEvent.dateTime).getTime() + 2 * 60 * 60 * 1000).toISOString(), // Add 2 hours as simple end_time
                    location: newEvent.location,
                    max_participants: newEvent.limit ? parseInt(newEvent.limit) : null,
                    image_url: newEvent.photo || null,
                })
            });

            if (response.ok) {
                alert("Evento creado con éxito.");
                setIsCreateEventOpen(false);
                setNewEvent({
                    name: "", description: "", photo: "", dateTime: "", location: "", limit: "", labels: "", preRegistered: "",
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

    return (
        <div className="events-container">
            <div className="events-header">
                <h2 className="section-title">Próximas Actividades</h2>
                <button
                    className="btn-primary"
                    onClick={() => setIsCreateEventOpen(true)}
                >
                    ➕ Crear Evento
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
                                    <label htmlFor="dateTime">Fecha y hora</label>
                                    <input
                                        id="dateTime"
                                        type="datetime-local"
                                        value={newEvent.dateTime}
                                        onChange={(e) => setNewEvent({ ...newEvent, dateTime: e.target.value })}
                                        required
                                    />
                                </div>
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
                            <div className="form-group">
                                <label htmlFor="preRegistered">Usuarios Pre-Confirmados (separados por comas)</label>
                                <input
                                    id="preRegistered"
                                    placeholder="Ej: Juan, María, Pedro"
                                    value={newEvent.preRegistered}
                                    onChange={(e) => setNewEvent({ ...newEvent, preRegistered: e.target.value })}
                                />
                            </div>
                            <div className="dialog-footer">
                                <button type="button" className="btn-secondary" onClick={() => setIsCreateEventOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary submit-btn">Publicar Evento</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="events-list">
                {loading ? (
                    <p>Cargando eventos...</p>
                ) : events.length === 0 ? (
                    <p>No hay eventos próximos.</p>
                ) : (
                    events.map((event) => (
                        <CommunityEvent
                            key={event.id}
                            id={event.id}
                            title={event.title}
                            date={new Date(event.start_time).toLocaleString('es-ES', {
                                weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                            })}
                            attendees={event.participants_count}
                            image={event.image_url || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=400"}
                            isJoined={event.is_joined}
                            onJoin={handleJoinEvent}
                            onLeave={handleLeaveEvent}
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
    isJoined,
    onJoin,
    onLeave,
}: any) {
    return (
        <div className="event-card">
            <div className="event-image-container">
                <img
                    src={image}
                    alt={title}
                    className="event-image"
                />
                <div className="event-badge">Social</div>
            </div>
            <div className="event-content">
                <h3 className="event-title">{title}</h3>
                <p className="event-date">📅 {date}</p>
                <div className="event-footer">
                    <div className="event-attendees">
                        <span className="attendees-text">
                            +{attendees} van
                        </span>
                    </div>
                    {isJoined ? (
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
