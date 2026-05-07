import type { AdminSpace, AdminSpaceReservation } from "../../../services/adminSpaces";

interface SpaceReservationsDrawerProps {
  open: boolean;
  space: AdminSpace | null;
  reservations: AdminSpaceReservation[];
  loading: boolean;
  statusFilter: "all" | "active" | "cancelled";
  onStatusFilterChange: (filter: "all" | "active" | "cancelled") => void;
  onClose: () => void;
}

function formatDateTime(dateTime: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateTime));
}

export function SpaceReservationsDrawer({
  open, space, reservations, loading, statusFilter, onStatusFilterChange, onClose,
}: SpaceReservationsDrawerProps) {
  if (!open || !space) return null;

  const filters = [
    { value: "all", label: "Todas" },
    { value: "active", label: "Activas" },
    { value: "cancelled", label: "Canceladas" },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-full w-full max-w-xl flex-col overflow-hidden bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>

        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">{space.name}</h2>
            <p className="text-sm text-gray-500">Reservas del espacio</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors" aria-label="Cerrar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex gap-1 border-b border-gray-200 px-6 py-2">
          {filters.map((f) => (
            <button key={f.value} type="button" onClick={() => onStatusFilterChange(f.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === f.value ? "bg-primary text-primary-foreground" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading ? (
            <p className="text-sm text-gray-500">Cargando reservas...</p>
          ) : reservations.length === 0 ? (
            <p className="text-sm text-gray-500">No hay reservas con este filtro.</p>
          ) : (
            reservations.map((r) => (
              <article key={r.id} className="rounded-lg border border-border/80 bg-white px-4 py-3 space-y-2 overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 break-words">
                      {r.user.first_name} {r.user.last_name}
                    </p>
                    <p className="text-xs text-gray-500 break-words">{r.user.email}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    r.status === "active" ? "bg-primary/10 text-primary" : "bg-slate-200 text-gray-500"
                  }`}>
                    {r.status === "active" ? "Activa" : "Cancelada"}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {formatDateTime(r.start_time)} → {formatDateTime(r.end_time)}
                </p>
                {r.notes && (
                  <p className="text-xs text-gray-500 border-t border-border/60 pt-2 break-words whitespace-pre-wrap">
                    Nota: {r.notes}
                  </p>
                )}
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
