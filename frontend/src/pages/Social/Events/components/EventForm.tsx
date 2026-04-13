import type React from 'react';
import { X } from 'lucide-react'; // Importamos el icono

type EventType = 'internal' | 'external';

type EventFormState = {
    name: string;
    description: string;
    photo: string;
    date: string;
    startTime: string;
    endTime: string;
    eventType: EventType;
    location: string;
    spaceId: string;
    limit: string;
    labels: string;
};

type CommonSpaceOption = {
    id: number;
    name: string;
};

export function EventForm({
    isEditingEvent,
    newEvent,
    setNewEvent,
    spaces,
    isLoadingSpaces,
    handleSaveEvent,
    setIsCreateEventOpen,
}: {
    isEditingEvent: boolean;
    newEvent: EventFormState;
    setNewEvent: React.Dispatch<React.SetStateAction<EventFormState>>;
    spaces: CommonSpaceOption[];
    isLoadingSpaces: boolean;
    handleSaveEvent: (e: React.FormEvent) => void;
    setIsCreateEventOpen: (open: boolean) => void;
}) {
    const minDateStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .split('T')[0];

    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            {/* Contenedor relativo para que la X se posicione correctamente */}
            <div className="relative bg-white text-card-foreground border border-gray-200 mt-10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-lg animate-in fade-in zoom-in duration-200">
                
                {/* BOTÓN X PARA CERRAR */}
                <button
                    type="button"
                    onClick={() => setIsCreateEventOpen(false)}
                    className="absolute right-4 top-4 p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all z-10"
                    aria-label="Cerrar formulario"
                >
                    <X size={20} />
                </button>

                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-xl font-semibold mb-1 tracking-tight pr-8">
                        {isEditingEvent ? "Editar Evento" : "Nuevo Evento"}
                    </h3>
                    <p className="text-sm text-gray-500">
                        {isEditingEvent ? "Modifica los detalles del evento." : "Organiza una actividad para compartir con otros residentes."}
                    </p>
                </div>

                <form onSubmit={handleSaveEvent} className="p-6 space-y-5">
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Nombre del evento *</label>
                        <input
                            id="name"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Ej: Tarde de Juegos"
                            value={newEvent.name}
                            onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="description" className="text-sm font-medium leading-none">Descripción *</label>
                        <textarea
                            id="description"
                            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y"
                            placeholder="Explica de qué trata el evento..."
                            value={newEvent.description}
                            onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                            required
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label htmlFor="date" className="text-sm font-medium leading-none">Fecha del evento *</label>
                            <input
                                id="date"
                                type="date"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={newEvent.date}
                                min={minDateStr}
                                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label htmlFor="startTime" className="text-sm font-medium leading-none">Hora de inicio *</label>
                            <input
                                id="startTime"
                                type="time"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={newEvent.startTime}
                                onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="endTime" className="text-sm font-medium leading-none">Hora de fin *</label>
                            <input
                                id="endTime"
                                type="time"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={newEvent.endTime}
                                onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label htmlFor="limit" className="text-sm font-medium leading-none">Límite de personas</label>
                            <input
                                id="limit"
                                type="number"
                                min="1"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                    <div className="space-y-2">
                        <label className="text-sm font-medium leading-none">Tipo de evento</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                type="button"
                                className={`rounded-md border px-4 py-2 text-sm text-left transition-colors ${newEvent.eventType === 'internal' ? 'border-primary bg-primary/10 text-foreground' : 'border-input bg-background text-muted-foreground hover:text-foreground'}`}
                                onClick={() => setNewEvent({ ...newEvent, eventType: 'internal', location: '' })}
                            >
                                Interno (espacio común)
                            </button>
                            <button
                                type="button"
                                className={`rounded-md border px-4 py-2 text-sm text-left transition-colors ${newEvent.eventType === 'external' ? 'border-primary bg-primary/10 text-foreground' : 'border-input bg-background text-muted-foreground hover:text-foreground'}`}
                                onClick={() => setNewEvent({ ...newEvent, eventType: 'external', spaceId: '' })}
                            >
                                Externo (ubicación libre)
                            </button>
                        </div>
                    </div>
                    {newEvent.eventType === 'internal' ? (
                        <div className="space-y-2">
                            <label htmlFor="space" className="text-sm font-medium leading-none">Espacio común *</label>
                            <select
                                id="space"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={newEvent.spaceId}
                                onChange={(e) => setNewEvent({ ...newEvent, spaceId: e.target.value })}
                                required
                                disabled={isLoadingSpaces}
                            >
                                <option value="">{isLoadingSpaces ? 'Cargando espacios...' : 'Selecciona un espacio'}</option>
                                {spaces.map((space) => (
                                    <option key={space.id} value={space.id}>{space.name}</option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <label htmlFor="location" className="text-sm font-medium leading-none">Lugar externo</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">📍</span>
                                <input
                                    id="location"
                                    className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    placeholder="Ej: Polideportivo municipal"
                                    value={newEvent.location}
                                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    )}
                    <div className="space-y-2">
                        <label htmlFor="photo" className="text-sm font-medium leading-none">URL de la foto</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-500 text-sm">🖼️</span>
                            <input
                                id="photo"
                                className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                placeholder="https://..."
                                value={newEvent.photo}
                                onChange={(e) => setNewEvent({ ...newEvent, photo: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="labels" className="text-sm font-medium leading-none">Etiquetas (separadas por comas)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-500 text-sm">🏷️</span>
                            <input
                                id="labels"
                                className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                placeholder="Ej: Juegos, Relax, Social"
                                value={newEvent.labels}
                                onChange={(e) => setNewEvent({ ...newEvent, labels: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
                        <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                            onClick={() => setIsCreateEventOpen(false)}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                        >
                            {isEditingEvent ? "Guardar Cambios" : "Publicar Evento"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}