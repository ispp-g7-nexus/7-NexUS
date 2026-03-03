// RecursosList.tsx
import React from 'react';

const TIPO_ICONS: Record<string, string> = {
    sala: '🏠',
    pista: '🏟️',
    equipamiento: '🎮',
    otro: '📦',
};

const TIPO_LABELS: Record<string, string> = {
    sala: 'Sala',
    pista: 'Pista',
    equipamiento: 'Equipamiento',
    otro: 'Otro',
};

export function RecursosList({
    recursos,
    loading,
    onOpen,
}: {
    recursos: any[];
    loading: boolean;
    onOpen: (recurso: any) => void;
}) {
    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="recurso-spinner" />
            </div>
        );
    }

    if (recursos.length === 0) {
        return (
            <div className="text-center py-16 text-muted-foreground">
                <p className="text-4xl mb-3">🏢</p>
                <p className="font-medium">No hay recursos disponibles</p>
                <p className="text-sm mt-1">El staff puede añadir recursos desde el botón superior.</p>
            </div>
        );
    }

    return (
        <div className="recursos-grid">
            {recursos.map((recurso) => (
                <div
                    key={recurso.id}
                    className="recurso-card"
                    onClick={() => onOpen(recurso)}
                >
                    <div className="recurso-card-icon">{TIPO_ICONS[recurso.tipo] || '📦'}</div>
                    <div className="recurso-card-body">
                        <div className="flex items-start justify-between gap-2">
                            <h3 className="recurso-card-title">{recurso.nombre}</h3>
                            <span className="recurso-tipo-badge">{TIPO_LABELS[recurso.tipo] || recurso.tipo}</span>
                        </div>
                        {recurso.descripcion && (
                            <p className="recurso-card-desc">{recurso.descripcion}</p>
                        )}
                        <div className="recurso-card-footer">
                            {recurso.aforo_maximo ? (
                                <span className="recurso-aforo">👥 Aforo: {recurso.aforo_maximo}</span>
                            ) : (
                                <span className="recurso-aforo">👥 Sin límite</span>
                            )}
                            <span className="recurso-ver-mas">Ver y reservar →</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}


// MisReservas.tsx — exported separately for import clarity
export function MisReservas({
    reservas,
    loading,
    onCancelar,
}: {
    reservas: any[];
    loading: boolean;
    onCancelar: (id: number) => void;
}) {
    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="recurso-spinner" />
            </div>
        );
    }

    const activas = reservas.filter(r => r.estado !== 'cancelada');
    const canceladas = reservas.filter(r => r.estado === 'cancelada');

    if (reservas.length === 0) {
        return (
            <div className="text-center py-16 text-muted-foreground">
                <p className="text-4xl mb-3">📅</p>
                <p className="font-medium">No tienes reservas</p>
                <p className="text-sm mt-1">Reserva un recurso desde la pestaña "Recursos Disponibles".</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {activas.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Reservas activas</h3>
                    <div className="space-y-3">
                        {activas.map((r) => (
                            <ReservaRow key={r.id} reserva={r} onCancelar={onCancelar} />
                        ))}
                    </div>
                </div>
            )}
            {canceladas.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Canceladas</h3>
                    <div className="space-y-3 opacity-60">
                        {canceladas.map((r) => (
                            <ReservaRow key={r.id} reserva={r} onCancelar={onCancelar} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function ReservaRow({ reserva, onCancelar }: { reserva: any; onCancelar: (id: number) => void }) {
    const inicio = new Date(reserva.fecha_inicio);
    const fin = new Date(reserva.fecha_fin);

    const formatTime = (d: Date) => d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const formatDate = (d: Date) => d.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' });

    return (
        <div className="reserva-row">
            <div className="reserva-row-info">
                <span className="font-medium text-foreground">{reserva.recurso?.nombre || 'Recurso'}</span>
                <span className="text-sm text-muted-foreground capitalize">{reserva.recurso?.tipo}</span>
                <span className="text-sm text-foreground mt-1">
                    📅 {formatDate(inicio)} · {formatTime(inicio)} – {formatTime(fin)}
                </span>
            </div>
            <div className="flex flex-col items-end gap-2">
                <span className={`reserva-estado estado-${reserva.estado}`}>{reserva.estado}</span>
                {reserva.estado !== 'cancelada' && (
                    <button
                        className="text-xs text-destructive border border-border hover:bg-destructive hover:text-destructive-foreground px-2 py-1 rounded transition-colors"
                        onClick={() => onCancelar(reserva.id)}
                    >
                        Cancelar
                    </button>
                )}
            </div>
        </div>
    );
}
