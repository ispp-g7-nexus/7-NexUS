import React from 'react';

export function EventForm({
    isEditingEvent,
    newEvent,
    setNewEvent,
    handleSaveEvent,
    setIsCreateEventOpen,
}: {
    isEditingEvent: boolean;
    newEvent: any;
    setNewEvent: React.Dispatch<React.SetStateAction<any>>;
    handleSaveEvent: (e: React.FormEvent) => void;
    setIsCreateEventOpen: (open: boolean) => void;
}) {
    // Determine the minimum date string (e.g. "2023-11-20") based on local timezone
    const minDateStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .split('T')[0];

    return (
        <div className="dialog-overlay">
            <div className="dialog-content">
                <div className="dialog-header">
                    <h3>{isEditingEvent ? "Editar Evento" : "Nuevo Evento"}</h3>
                    <p>{isEditingEvent ? "Modifica los detalles del evento." : "Organiza una actividad para compartir con otros residentes."}</p>
                </div>
                <form onSubmit={handleSaveEvent} className="dialog-form">
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
                                min={minDateStr}
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
                                min="1"
                                placeholder="Sin límite"
                                value={newEvent.limit}
                                onChange={(e) => {
                                    const target = e.target as HTMLInputElement;
                                    target.setCustomValidity("");
                                    setNewEvent({ ...newEvent, limit: target.value });
                                }}
                                onInvalid={(e) => {
                                    const target = e.target as HTMLInputElement;
                                    if (target.validity.rangeUnderflow) {
                                        target.setCustomValidity("El valor tiene que ser mayor que 0");
                                    } else {
                                        target.setCustomValidity("Rellena este campo");
                                    }
                                }}
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
                        <button type="submit" className="btn-primary submit-btn">{isEditingEvent ? "Guardar Cambios" : "Publicar Evento"}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
