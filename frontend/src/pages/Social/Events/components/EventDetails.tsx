import { useState } from "react";
import { Edit2, Trash2 } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "../../../../components/ui/dialog";

export function EventDetails({
    selectedEvent,
    participants,
    setSelectedEvent,
    handleLeaveEvent,
    handleJoinEvent,
    handleDeleteEvent,
    onEditEvent,
}: {
    selectedEvent: any;
    participants: any[];
    setSelectedEvent: (event: any) => void;
    handleLeaveEvent: (id: number) => Promise<void>;
    handleJoinEvent: (id: number) => Promise<void>;
    handleDeleteEvent: (id: number) => Promise<void>;
    onEditEvent: (event: any) => void;
}) {
    // Estado para el modal de confirmación de eliminación
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    if (!selectedEvent) return null;

    const now = new Date();
    const isPastEvent = new Date(selectedEvent.end_time) < now;
    const isAdmin = localStorage.getItem('userRole') === 'admin';
    const venueLabel = selectedEvent.event_type === 'internal'
        ? `Espacio común: ${selectedEvent.space?.name || 'Sin espacio'}`
        : `Ubicación: ${selectedEvent.location}`;

    const onConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            await handleDeleteEvent(selectedEvent.id);
            setIsDeleteDialogOpen(false);
            setSelectedEvent(null);
        } catch (error) {
            console.error("Error eliminando evento", error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="dialog-overlay" onClick={() => setSelectedEvent(null)}>
                <div className="dialog-content event-details-modal" onClick={e => e.stopPropagation()}>
                    <div className="details-header-image">
                        <img 
                            src={selectedEvent.image_url || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&q=80&w=400"} 
                            alt={selectedEvent.title} 
                        />
                        <div className="close-btn" onClick={() => setSelectedEvent(null)}>✕</div>
                    </div>
                    
                    <div className="details-body" style={{ textAlign: 'left' }}>
                        <h2>{selectedEvent.title}</h2>
                        <p className="details-host">
                            Organizado por {selectedEvent.host?.first_name || 'Usuario'} {selectedEvent.host?.last_name || ''}
                        </p>

                        <div className="details-info-row">
                            <span>🗓️ {new Date(selectedEvent.start_time).toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} - {new Date(selectedEvent.end_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>📍 {venueLabel}</span>
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

                    <div className="dialog-footer" style={{ padding: '0 24px 24px 24px', margin: 0, flexDirection: 'column', gap: '8px' }}>
                        {selectedEvent.can_edit && (
                            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                {!isPastEvent && (
                                    <Button
                                        className="flex-1 rounded-xl font-bold"
                                        variant="outline"
                                        onClick={() => onEditEvent(selectedEvent)}
                                    >
                                        <Edit2 className="w-4 h-4 mr-2" /> Editar
                                    </Button>
                                )}
                                <Button
                                    className="flex-1 rounded-xl font-bold"
                                    variant="destructive"
                                    onClick={() => setIsDeleteDialogOpen(true)}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                                </Button>
                            </div>
                        )}
                        
                        {isPastEvent ? (
                            <p className="no-participants" style={{ width: '100%', textAlign: 'center' }}>Este evento ya ha finalizado.</p>
                        ) : isAdmin ? null : selectedEvent.is_joined ? (
                            <button className="btn-leave" style={{ width: '100%' }} onClick={async () => { await handleLeaveEvent(selectedEvent.id); setSelectedEvent(null); }}>Desapuntarme</button>
                        ) : selectedEvent.can_join === false ? (
                            <button className="btn-secondary" style={{ width: '100%', cursor: 'default' }} disabled>
                                Aforo completado
                            </button>
                        ) : (
                            <button className="btn-join" style={{ width: '100%', justifyContent: 'center' }} onClick={async () => { await handleJoinEvent(selectedEvent.id); setSelectedEvent(null); }}>Apuntarme al Evento</button>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL DE ELIMINACIÓN (ESTILO INCIDENCIAS) */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="max-w-[400px] rounded-3xl p-6">
                    <DialogTitle className="text-center text-lg font-bold">¿Eliminar evento?</DialogTitle>

                    <DialogDescription className="text-center text-gray-500 mt-2">
                        Esta acción no se puede deshacer. El evento <span className="font-bold text-gray-900">"{selectedEvent.title}"</span> y toda su lista de asistentes serán borrados permanentemente.
                    </DialogDescription>

                    <div className="flex gap-3 mt-6">
                        <Button
                            variant="outline"
                            onClick={() => setIsDeleteDialogOpen(false)}
                            className="flex-1 rounded-xl h-12 font-bold"
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={onConfirmDelete}
                            disabled={isDeleting}
                            className="flex-1 rounded-xl h-12 font-bold"
                        >
                            {isDeleting ? "Eliminando..." : "Eliminar"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}