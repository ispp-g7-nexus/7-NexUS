import { useState, useEffect } from "react";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "../../../components/ui/sheet";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function ResidentForm({ open, onOpenChange }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [room, setRoom] = useState("");
  const [building, setBuilding] = useState("");
  const [checkin, setCheckin] = useState("");
  const [state, setState] = useState("Activo");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      setFullName("");
      setEmail("");
      setPassword("");
      setRoom("");
      setBuilding("");
      setCheckin("");
      setState("Activo");
      setError(null);
      setErrors({});
    }
  }, [open]);

  const submit = async () => {
    const nextErrors: Record<string, string> = {};
    if (!fullName.trim()) nextErrors.fullName = "El nombre es obligatorio.";
    if (!email.trim()) {
      nextErrors.email = "El email es obligatorio.";
    } else {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(email)) nextErrors.email = "El email es incorrecto.";
    }
    if (!password) nextErrors.password = "La contraseña es obligatoria.";
    if (password && password.length < 6) nextErrors.password = "La contraseña debe tener al menos 6 caracteres.";
    if (!room.trim()) nextErrors.room = "La habitación es obligatoria.";
    if (!building.trim()) nextErrors.building = "El edificio es obligatorio.";
    if (!checkin) nextErrors.checkin = "La fecha de check-in es obligatoria.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/residents/create/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          room,
          building,
          checkin_date: checkin || null,
          state,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json && typeof json === "object") {
          const mapped: Record<string, string> = {};
          if (json.email) mapped.email = Array.isArray(json.email) ? String(json.email[0]) : String(json.email);
          if (json.password) mapped.password = Array.isArray(json.password) ? String(json.password[0]) : String(json.password);
          if (json.full_name) mapped.fullName = Array.isArray(json.full_name) ? String(json.full_name[0]) : String(json.full_name);
          if (json.room) mapped.room = Array.isArray(json.room) ? String(json.room[0]) : String(json.room);
          if (json.building) mapped.building = Array.isArray(json.building) ? String(json.building[0]) : String(json.building);
          if (json.checkin_date) mapped.checkin = Array.isArray(json.checkin_date) ? String(json.checkin_date[0]) : String(json.checkin_date);
          if (Object.keys(mapped).length > 0) {
            setErrors(mapped);
            throw new Error(json.detail || "Error de validación");
          }
        }
        throw new Error(json.detail || "Error creando residente");
      }

      onOpenChange(false);
    } catch (e: any) {
      setError(String(e.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <div />
      </SheetTrigger>
      <SheetContent side="top" className="mx-auto max-w-2xl rounded-lg">
        <SheetHeader>
          <SheetTitle>Nuevo Residente</SheetTitle>
          <SheetDescription>Completa los datos del nuevo residente</SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-4">
          <div>
            <Label>Nombre completo *</Label>
            <Input className="mt-2" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ej: María González" aria-invalid={!!errors.fullName} />
            {errors.fullName && <p className="text-sm text-red-600 mt-1">{errors.fullName}</p>}
          </div>

          <div>
            <Label>Email *</Label>
            <Input className="mt-2" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="estudiante@email.com" aria-invalid={!!errors.email} />
            {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
          </div>
          <div>
            <Label>Contraseña</Label>
            <Input className="mt-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña temporal" aria-invalid={!!errors.password} />
            {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password}</p>}
          </div>
          


          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Habitación *</Label>
              <Input className="mt-2" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Ej: 302-B" aria-invalid={!!errors.room} />
              {errors.room && <p className="text-sm text-red-600 mt-1">{errors.room}</p>}
            </div>
            <div>
              <Label>Edificio *</Label>
              <Input className="mt-2" value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="Ej: A" aria-invalid={!!errors.building} />
              {errors.building && <p className="text-sm text-red-600 mt-1">{errors.building}</p>}
            </div>
          </div>

          <div>
            <Label>Fecha de Check-in *</Label>
            <Input className="mt-2" type="date" value={checkin} onChange={(e) => setCheckin(e.target.value)} aria-invalid={!!errors.checkin} />
            {errors.checkin && <p className="text-sm text-red-600 mt-1">{errors.checkin}</p>}
          </div>

          <div>
            <Label>Estado *</Label>
            <select value={state} onChange={(e) => setState(e.target.value)} className="w-full p-2 mt-2 rounded-md border" aria-invalid={!!errors.state}>
              <option>Activo</option>
              <option>Inactivo</option>
            </select>
            {errors.state && <p className="text-sm text-red-600 mt-1">{errors.state}</p>}
          </div>

          {error && <div className="text-red-600">{error}</div>}
        </div>

        <SheetFooter>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={submitting}>{submitting ? "..." : "Agregar Residente"}</Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default ResidentForm;
