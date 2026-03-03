import React, { useState } from 'react';

const TIPO_ICONS: Record<string, string> = {
    sala: '🏠',
    pista: '🏟️',
    equipamiento: '🎮',
    otro: '📦',
};

function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString('es-ES', {
        weekday: 'short', day: '2-digit', month: 'short',
        hour: '2-digit', minute: '2-digit',
    });
}

export function RecursoDetails({
    recurso,
    reservas,
    onClose,
    onDelete,
    onEdit,
    onCrearReserva,
    onCancelarReserva,
}: {
    recurso: any;
    reservas: any[];
    onClose: () => void;
    onDelete: (id: number) => void;
    onEdit: (recurso: any) => void;
    onCrearReserva: (recursoId: number, inicio: string, fin: string) => void;
    onCancelarReserva: (reservaId: number) => void;
}) {
    const [fecha, setFecha] = useState('');
    const [horaInicio, setHoraInicio] = useState('');
    const [horaFin, setHoraFin] = useState('');

    if (!recurso) return null;

    const minDateStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString().split('T')[0];

    const handleReservar = (e: React.FormEvent) => {
        e.preventDefault();
        const inicio = new Date(`${fecha}T${horaInicio}`).toISOString();
        const fin = new Date(`${fecha}T${horaFin}`).toISOString();
        onCrearReserva(recurso.id, inicio, fin);
        setFecha(''); setHoraInicio(''); setHoraFin('');
    };

    return (
        <div className="dialog-overlay" onClick={onClose}>
            <div className="dialog-content event-details-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="recurso-detail-header">
                    <div className="recurso-detail-icon">{TIPO_ICONS[recurso.tipo] || '📦'}</div>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="details-body">
                    <div className="flex items-start justify-between gap-3 mb-1">
                        <h2 className="text-2xl font-semibold text-foreground">{recurso.nombre}</h2>
                        {recurso.can_edit && (
                            <div className="flex gap-2 shrink-0">
                                <button
                                    className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-accent transition-colors"
                                    onClick={() => onEdit(recurso)}
                                >✏️ Editar</button>
                                <button
                                    className="text-sm px-3 py-1.5 rounded-md border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                                    onClick={() => onDelete(recurso.id)}
                                >🗑️ Eliminar</button>
                            </div>
                        )}
                    </div>

                    <p className="details-host capitalize">{recurso.tipo}</p>

                    <div className="details-info-row">
                        {recurso.aforo_maximo && (
                            <span>👥 Aforo máximo: <strong>{recurso.aforo_maximo}</strong></span>
                        )}
                    </div>

                    {recurso.descripcion && (
                        <div className="details-description">
                            <h3>Descripción</h3>
                            <p>{recurso.descripcion}</p>
                        </div>
                    )}

                    {/* Reservar */}
                    <div className="recurso-reservar-section">
                        <h3 className="text-base font-semibold mb-3">Hacer una reserva</h3>
                        <form onSubmit={handleReservar} className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-sm font-medium">Fecha</label>
                                <input
                                    type="date"
                                    min={minDateStr}
                                    value={fecha}
                                    onChange={(e) => setFecha(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Hora inicio</label>
                                    <input
                                        type="time"
                                        value={horaInicio}
                                        onChange={(e) => setHoraInicio(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Hora fin</label>
                                    <input
                                        type="time"
                                        value={horaFin}
                                        onChange={(e) => setHoraFin(e.target.value)}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        required
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-10 rounded-md text-sm font-medium transition-colors"
                            >
                                Reservar
                            </button>
                        </form>
                    </div>

                    {/* Reservas actuales */}
                    <div className="details-participants mt-4">
                        <h3>Reservas activas</h3>
                        {reservas.length === 0 ? (
                            <p className="no-participants">No hay reservas para este recurso.</p>
                        ) : (
                            <ul className="reservas-list">
                                {reservas.map((r) => (
                                    <li key={r.id} className="reserva-item">
                                        <div>
                                            <span className="font-medium text-sm">{r.usuario.first_name} {r.usuario.last_name}</span>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {formatDateTime(r.fecha_inicio)} → {formatDateTime(r.fecha_fin)}
                                            </p>
                                            <span className={`reserva-estado estado-${r.estado}`}>{r.estado}</span>
                                        </div>
                                        {r.can_cancel && (
                                            <button
                                                className="text-xs text-destructive border border-border hover:bg-destructive hover:text-destructive-foreground px-2 py-1 rounded transition-colors"
                                                onClick={() => onCancelarReserva(r.id)}
                                            >
                                                Cancelar
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
