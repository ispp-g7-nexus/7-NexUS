import { Plus, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import {
  createSpace,
  deactivateSpace,
  listAdminSpaces,
  listSpaceReservations,
  updateSpace,
  type AdminSpace,
  type AdminSpaceReservation,
  type CreateSpacePayload,
} from "../../services/adminSpaces";

import { SpaceFormSheet } from "./components/SpaceFormSheet";
import { SpaceReservationsDrawer } from "./components/SpaceReservationsDrawer";

import { isApiError } from "../../services/reservations";
function SpaceCard({
  space,
  onEdit,
  onDeactivate,
  onViewReservations,
}: {
  space: AdminSpace;
  onEdit: (space: AdminSpace) => void;
  onDeactivate: (space: AdminSpace) => void;
  onViewReservations: (space: AdminSpace) => void;
}) {
  return (
    <article className="rounded-xl border border-border/80 bg-card p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-foreground truncate">{space.name}</h3>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                space.is_active
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              {space.is_active ? "Activo" : "Inactivo"}
            </span>
          </div>
          {space.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{space.description}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-sm">
        <div className="rounded-lg bg-muted/60 px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground">Aforo</p>
          <p className="font-semibold text-foreground">{space.capacity}</p>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground">Apertura</p>
          <p className="font-semibold text-foreground">{space.open_time.slice(0, 5)}</p>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground">Cierre</p>
          <p className="font-semibold text-foreground">{space.close_time.slice(0, 5)}</p>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2 text-center">
          <p className="text-xs text-muted-foreground">Intervalo de reserva</p>
          <p className="font-semibold text-foreground">{space.reservation_interval_minutes}m</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => onViewReservations(space)}>
          Ver reservas
        </Button>
        <Button variant="outline" size="sm" onClick={() => onEdit(space)}>
          Editar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/40"
          onClick={() => onDeactivate(space)}
          disabled={!space.is_active}
        >
          {space.is_active ? "Desactivar" : "Ya inactivo"}
        </Button>
      </div>
    </article>
  );
}

export function AdminSpaces() {
  const [spaces, setSpaces] = useState<AdminSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  // Form sheet
  const [formOpen, setFormOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<AdminSpace | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reservations drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSpace, setDrawerSpace] = useState<AdminSpace | null>(null);
  const [reservations, setReservations] = useState<AdminSpaceReservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "cancelled">("active");

  const loadSpaces = async () => {
    setLoading(true);
    try {
      const data = await listAdminSpaces();
      setSpaces(data);
    } catch (err) {
      if (isApiError(err) && (err.status === 401 || err.status === 403)) {
        setUnauthorized(true);
        return;
      }
      toast.error(isApiError(err) ? err.message : "No se pudieron cargar los espacios.");
    } finally {
      setLoading(false);
    }
  };

  const loadReservations = async (space: AdminSpace, filter: "all" | "active" | "cancelled") => {
    setLoadingReservations(true);
    try {
      const data = await listSpaceReservations(space.id, filter === "all" ? undefined : filter);
      setReservations(data);
    } catch (err) {
      toast.error(isApiError(err) ? err.message : "No se pudieron cargar las reservas.");
    } finally {
      setLoadingReservations(false);
    }
  };

  useEffect(() => {
    void loadSpaces();
  }, []);

  const handleOpenCreate = () => {
    setEditingSpace(null);
    setFormOpen(true);
  };

  const handleOpenEdit = (space: AdminSpace) => {
    setEditingSpace(space);
    setFormOpen(true);
  };

  const handleSubmitForm = async (payload: CreateSpacePayload) => {
    setSubmitting(true);
    try {
      if (editingSpace) {
        await updateSpace(editingSpace.id, payload);
        toast.success("Espacio actualizado correctamente.");
      } else {
        await createSpace(payload);
        toast.success("Espacio creado correctamente.");
      }
      setFormOpen(false);
      await loadSpaces();
    } catch (err) {
      toast.error(isApiError(err) ? err.message : "Error al guardar el espacio.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (space: AdminSpace) => {
    if (!window.confirm(`¿Desactivar "${space.name}"? Se cancelarán todas sus reservas activas.`)) return;
    try {
      await deactivateSpace(space.id);
      toast.success("Espacio desactivado.");
      await loadSpaces();
    } catch (err) {
      toast.error(isApiError(err) ? err.message : "Error al desactivar el espacio.");
    }
  };

  const handleViewReservations = async (space: AdminSpace) => {
    setDrawerSpace(space);
    setStatusFilter("active");
    setDrawerOpen(true);
    await loadReservations(space, "active");
  };

  const handleStatusFilterChange = async (filter: "all" | "active" | "cancelled") => {
    setStatusFilter(filter);
    if (drawerSpace) await loadReservations(drawerSpace, filter);
  };

  if (unauthorized) {
    return (
      <Card className="mx-auto mt-6 w-full max-w-3xl">
        <CardContent className="space-y-4 p-6 text-center">
          <h2 className="text-xl font-semibold">Acceso no autorizado</h2>
          <p className="text-sm text-muted-foreground">
            Necesitas permisos de administrador para gestionar los espacios.
          </p>
          <Button onClick={() => (window.location.href = "/")}>Ir al inicio</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 pb-24">
      {/* Header */}
      <header className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Gestión de espacios</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Crea, edita y consulta las reservas de los espacios comunes de la residencia.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => void loadSpaces()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
            <Button type="button" onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo espacio
            </Button>
          </div>
        </div>
      </header>

      {/* Space grid */}
      {loading ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">Cargando espacios...</CardContent>
        </Card>
      ) : spaces.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            No hay espacios registrados aún. Crea el primero.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spaces.map((space) => (
            <SpaceCard
              key={space.id}
              space={space}
              onEdit={handleOpenEdit}
              onDeactivate={handleDeactivate}
              onViewReservations={handleViewReservations}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      <SpaceFormSheet
        open={formOpen}
        space={editingSpace}
        isSubmitting={submitting}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmitForm}
      />

      {/* Reservations drawer */}
      <SpaceReservationsDrawer
        open={drawerOpen}
        space={drawerSpace}
        reservations={reservations}
        loading={loadingReservations}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        onClose={() => setDrawerOpen(false)}
      />
    </section>
  );
}
