import React, { useState, useEffect } from "react";
import { fetchWithAuth, API_URL } from "../../utils/api";
import { EventForm } from "./components/EventForm";
import { EventDetails } from "./components/EventDetails";
import { UpcomingEvents } from "./components/UpcomingEvents";
import { PastEvents } from "./components/PastEvents";
import "./Events.css";

export function Events() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUnauthorized, setIsUnauthorized] = useState(false);
    const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
    const [isEditingEvent, setIsEditingEvent] = useState(false);
    const [editingEventId, setEditingEventId] = useState<number | null>(null);
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
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const response = await fetchWithAuth(API_URL);
            if (response.status === 401 || response.status === 403) {
                setIsUnauthorized(true);
                return;
            }
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
            if (response.status === 401 || response.status === 403) {
                setIsUnauthorized(true);
                return;
            }
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

            if (response.status === 401 || response.status === 403) {
                setIsUnauthorized(true);
                return;
            }

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

            if (response.status === 401 || response.status === 403) {
                setIsUnauthorized(true);
                return;
            }

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

    const handleSaveEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const method = isEditingEvent ? 'PUT' : 'POST';
            const url = isEditingEvent ? `${API_URL}${editingEventId}/` : API_URL;

            const response = await fetchWithAuth(url, {
                method: method,
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

            if (response.status === 401 || response.status === 403) {
                setIsUnauthorized(true);
                return;
            }

            if (response.ok) {
                alert(isEditingEvent ? "Evento guardado con éxito." : "Evento creado con éxito.");
                setIsCreateEventOpen(false);
                setIsEditingEvent(false);
                setEditingEventId(null);
                setNewEvent({
                    name: "", description: "", photo: "", date: "", startTime: "", endTime: "", location: "", limit: "", labels: "",
                });
                fetchEvents();
            } else {
                const data = await response.json();
                alert(`Error: ${JSON.stringify(data.detail || data)}`);
            }
        } catch (error) {
            console.error("Error saving event:", error);
            alert("Error de conexión al guardar el evento");
        }
    };

    const handleDeleteEvent = async (eventId: number) => {
        if (!window.confirm("¿Estás seguro de que quieres eliminar este evento?")) {
            return;
        }

        try {
            const response = await fetchWithAuth(`${API_URL}${eventId}/`, {
                method: 'DELETE',
            });

            if (response.status === 401 || response.status === 403) {
                setIsUnauthorized(true);
                return;
            }

            if (response.ok || response.status === 204) {
                alert("Evento eliminado con éxito.");
                fetchEvents();
                setSelectedEvent(null);
            } else {
                const data = await response.json();
                alert(`Error al eliminar: ${JSON.stringify(data.detail || data)}`);
            }
        } catch (error) {
            console.error("Error deleting event:", error);
            alert("Error de conexión al eliminar el evento");
        }
    };

    const now = new Date();
    const upcomingEvents = events.filter(e => new Date(e.end_time) >= now);
    const pastEvents = events.filter(e => new Date(e.end_time) < now);

    if (isUnauthorized) {
        return (
            <div className="events-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: 'var(--foreground)' }}>Acceso Denegado</h2>
                <p style={{ color: 'var(--muted-foreground)', maxWidth: '400px', lineHeight: '1.5' }}>
                    Debes iniciar sesión para ver y organizar las actividades de tu residencia.
                </p>
                <button
                    className="btn-primary"
                    style={{ marginTop: '24px' }}
                    onClick={() => window.location.href = '/login'}
                >
                    Ir a Iniciar Sesión
                </button>
            </div>
        );
    }

    return (
        <div className="events-container">
            <div className="events-header">
                <h2 className="section-title">Actividades de la Residencia</h2>
                <button
                    className="btn-primary"
                    onClick={() => {
                        setNewEvent({
                            name: "", description: "", photo: "", date: "", startTime: "", endTime: "", location: "", limit: "", labels: "",
                        });
                        setIsEditingEvent(false);
                        setEditingEventId(null);
                        setIsCreateEventOpen(true);
                    }}
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
                <EventForm
                    isEditingEvent={isEditingEvent}
                    newEvent={newEvent}
                    setNewEvent={setNewEvent}
                    handleSaveEvent={handleSaveEvent}
                    setIsCreateEventOpen={setIsCreateEventOpen}
                />
            )}

            <EventDetails
                selectedEvent={selectedEvent}
                participants={participants}
                setSelectedEvent={setSelectedEvent}
                handleLeaveEvent={handleLeaveEvent}
                handleJoinEvent={handleJoinEvent}
                handleDeleteEvent={handleDeleteEvent}
                onEditEvent={(event) => {
                    setNewEvent({
                        name: event.title,
                        description: event.description,
                        photo: event.image_url || "",
                        date: event.start_time.split('T')[0],
                        startTime: new Date(event.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                        endTime: new Date(event.end_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
                        location: event.location,
                        limit: event.max_participants ? event.max_participants.toString() : "",
                        labels: event.tags || "",
                    });
                    setEditingEventId(event.id);
                    setIsEditingEvent(true);
                    setIsCreateEventOpen(true);
                    setSelectedEvent(null);
                }}
            />

            {activeTab === 'upcoming' ? (
                <UpcomingEvents
                    events={upcomingEvents}
                    loading={loading}
                    handleJoinEvent={handleJoinEvent}
                    handleLeaveEvent={handleLeaveEvent}
                    handleOpenDetails={handleOpenDetails}
                />
            ) : (
                <PastEvents
                    events={pastEvents}
                    loading={loading}
                    handleJoinEvent={handleJoinEvent}
                    handleLeaveEvent={handleLeaveEvent}
                    handleOpenDetails={handleOpenDetails}
                />
            )}
        </div>
    );
}
