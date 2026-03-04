// src/pages/Staff/Staff.tsx
import { useMemo, useState } from "react";
import { Briefcase, Clock, Search, UserPlus } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { NativeSelect } from "../../components/ui/native-select";
import type { StaffMember } from "../../services/staff";
import { DeleteStaffDialog } from "./components/DeleteStaffDialog";
import { StaffCard } from "./components/StaffCard";
import { StaffFormDialog } from "./components/StaffFormDialog";
import { useStaff } from "./hooks/useStaff";

function StatCard({
  label,
  value,
  icon,
  valueClass = "text-gray-900",
  iconBg = "bg-gray-100",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  valueClass?: string;
  iconBg?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-gray-500 truncate">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${valueClass}`}>{value}</p>
          </div>
          <div className={`w-12 h-12 shrink-0 ${iconBg} rounded-lg flex items-center justify-center`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Staff() {
  const { staff, loading, isUnauthorized, createStaff, updateStaff, deleteStaff } = useStaff();

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [deletingMember, setDeletingMember] = useState<StaffMember | null>(null);

  // Derive unique departments from loaded data
  const departments = useMemo(
    () => Array.from(new Set(staff.map((s) => s.department).filter(Boolean))).sort(),
    [staff],
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return staff.filter((s) => {
      const matchesSearch =
        !q ||
        s.full_name.toLowerCase().includes(q) ||
        s.job_title.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q);
      const matchesDept = deptFilter === "all" || s.department === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [staff, search, deptFilter]);

  const totalActive = useMemo(() => staff.filter((s) => s.status === "active").length, [staff]);
  const totalHolidays = useMemo(() => staff.filter((s) => s.status === "holidays").length, [staff]);

  if (isUnauthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-2">
        <Briefcase className="w-10 h-10 opacity-40" />
        <p className="text-sm">No tienes permisos para ver el personal.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Directorio de Personal</h2>
          <p className="text-sm text-gray-500 mt-1">
            Gestión y contacto del equipo de la residencia
          </p>
        </div>
        <Button
          className="bg-[#509550] hover:bg-[#509550]/90 text-white"
          onClick={() => setCreateOpen(true)}
        >
          <UserPlus className="w-4 h-4" />
          Añadir personal
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total personal"
          value={staff.length}
          icon={<Briefcase className="w-6 h-6 text-[#509550]" />}
          iconBg="bg-[#509550]/10"
        />
        <StatCard
          label="Activos"
          value={totalActive}
          icon={<Clock className="w-6 h-6 text-green-600" />}
          iconBg="bg-green-500/10"
          valueClass="text-green-600"
        />
        <StatCard
          label="De Vacaciones"
          value={totalHolidays}
          icon={<Clock className="w-6 h-6 text-orange-500" />}
          iconBg="bg-orange-400/10"
          valueClass="text-orange-600"
        />
        <StatCard
          label="Departamentos"
          value={departments.length}
          icon={<Briefcase className="w-6 h-6 text-gray-500" />}
          iconBg="bg-gray-100"
        />
      </div>

      {/* Search + Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                placeholder="Buscar por nombre, cargo o email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <NativeSelect
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="sm:w-52"
            >
              <option value="all">Todos los departamentos</option>
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl border border-gray-200 bg-gray-50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-14">
            <div className="text-center">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {search || deptFilter !== "all"
                  ? "No se encontraron resultados para los filtros aplicados."
                  : "Aún no hay personal registrado."}
              </p>
              {!search && deptFilter === "all" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setCreateOpen(true)}
                >
                  <UserPlus className="w-4 h-4" /> Añadir el primero
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((member) => (
            <StaffCard
              key={member.id}
              member={member}
              onEdit={setEditingMember}
              onDelete={setDeletingMember}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <StaffFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        member={null}
        onCreate={createStaff}
        onUpdate={updateStaff}
      />

      {/* Edit dialog */}
      <StaffFormDialog
        open={editingMember !== null}
        onOpenChange={(v) => !v && setEditingMember(null)}
        member={editingMember}
        onCreate={createStaff}
        onUpdate={updateStaff}
      />

      {/* Delete dialog */}
      <DeleteStaffDialog
        member={deletingMember}
        onConfirm={deleteStaff}
        onClose={() => setDeletingMember(null)}
      />
    </div>
  );
}

export default Staff;
