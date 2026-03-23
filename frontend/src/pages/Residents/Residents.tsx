import { useMemo, useState } from "react";
import { Plus, Search, Users } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { NativeSelect } from "../../components/ui/native-select";
import type { Resident } from "../../services/residents";
import { DeleteResidentDialog } from "./components/DeleteResidentDialog";
import { ResidentCard } from "./components/ResidentCard";
import { ResidentFormDialog } from "./components/ResidentFormDialog";
import { useResidents } from "./hooks/useResidents";

type StatusFilter = "all" | "active" | "inactive";

export function Residents() {
  const { residents, loading, isUnauthorized, createResident, updateResident, deleteResident } =
    useResidents();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [deletingResident, setDeletingResident] = useState<Resident | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return residents.filter((r) => {
      const matchesSearch =
        !q ||
        r.full_name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.room.toLowerCase().includes(q) ||
        r.building.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && r.is_active) ||
        (statusFilter === "inactive" && !r.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [residents, search, statusFilter]);

  if (isUnauthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-2">
        <Users className="w-10 h-10 opacity-40" />
        <p className="text-sm">No tienes permisos para ver los residentes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Residentes</h2>
          <p className="text-gray-500 text-sm">
            {residents.length} residente{residents.length !== 1 ? "s" : ""} registrado
            {residents.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="w-4 h-4" />
          Nuevo Residente
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Buscar por nombre, email, habitación…"
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <NativeSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="sm:w-48"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </NativeSelect>
      </div>

      {/* Resident list */}
      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl border border-gray-200 bg-gray-50 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <Users className="w-12 h-12 opacity-30" />
          <p className="text-sm">
            {search || statusFilter !== "all"
              ? "No hay residentes que coincidan con los filtros."
              : "Aún no hay residentes registrados."}
          </p>
          {!search && statusFilter === "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="w-4 h-4" /> Añadir el primero
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((resident) => (
            <ResidentCard
              key={resident.id}
              resident={resident}
              onEdit={setEditingResident}
              onDelete={setDeletingResident}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <ResidentFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        resident={null}
        onCreate={createResident}
        onUpdate={updateResident}
      />

      {/* Edit dialog */}
      <ResidentFormDialog
        open={editingResident !== null}
        onOpenChange={(v) => !v && setEditingResident(null)}
        resident={editingResident}
        onCreate={createResident}
        onUpdate={updateResident}
      />

      {/* Delete confirmation */}
      <DeleteResidentDialog
        resident={deletingResident}
        onConfirm={deleteResident}
        onClose={() => setDeletingResident(null)}
      />
    </div>
  );
}

export default Residents;

