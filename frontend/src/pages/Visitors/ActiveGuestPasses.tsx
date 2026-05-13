import {
  CalendarClock,
  History,
  LogOut,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Ticket,
  User,
  UserRoundPlus,
  Loader2,
  ShieldAlert
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select1, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { NotificationBell } from "../../components/announcement/NotificationBell";
import type { StudentTab } from "../../components/StudentHome";
import {
  cancelMyGuestPass,
  createMyGuestPass,
  GuestPassApiError,
  type GuestPass,
  type GuestPassPolicy,
  getMyGuestPassPolicy,
  listMyActiveGuestPasses,
  listMyUpcomingGuestPasses,
  listMyGuestPassHistory,
} from "../../services/guestPasses";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";

const DEFAULT_MAX_DURATION_HOURS = 24;
const DEFAULT_MAX_CONCURRENT_PASSES = 3;
const TIME_SLOT_INTERVAL_MINUTES = 30;
const VISIT_STATE_CHANGED_EVENT = "visit-state-changed";

interface ActiveGuestPassesPageProps {
  readonly onGoToProfile?: () => void;
  readonly onLogout?: () => void;
  readonly onNavigate?: (view: StudentTab) => void;
}

type GuestPassFormState = {
  guest_first_name: string;
  guest_last_name: string;
  valid_from: string;
  valid_until: string;
  comment: string;
};

type GuestPassFormErrors = Partial<Record<keyof GuestPassFormState, string>>;

const STATUS_BADGE_STYLES = {
  ACTIVE: { label: "Activo", badgeClass: "bg-emerald-100 text-emerald-700" },
  USED: { label: "Usado", badgeClass: "bg-blue-100 text-blue-700" },
  CANCELLED: { label: "Cancelado", badgeClass: "bg-gray-100 text-gray-600" },
  REVOKED: { label: "Revocado", badgeClass: "bg-red-100 text-red-700" },
  REJECTED: { label: "Rechazado", badgeClass: "bg-orange-100 text-orange-700" },
  INACTIVE: { label: "Inactivo", badgeClass: "bg-yellow-100 text-yellow-700" },
};

function toMinutesFromClock(clockValue: string): number | null {
  const normalized = clockValue.trim().slice(0, 5);
  const [hourPart, minutePart] = normalized.split(":");
  const hours = Number(hourPart);
  const minutes = Number(minutePart);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function toDateTimeLocalValue(date: Date): string {
  const localDate = new Date(date);
  localDate.setSeconds(0, 0);
  const timezoneOffsetMs = localDate.getTimezoneOffset() * 60 * 1000;
  return new Date(localDate.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

const toDateInputValue = (date: Date) => toDateTimeLocalValue(date).slice(0, 10);

function splitDateTimeLocal(value: string) {
  const [datePart = "", timePart = ""] = value.split("T");
  return { datePart, timePart: timePart.slice(0, 5) };
}

const combineDateAndTimeLocal = (datePart: string, timePart: string) =>
  datePart && timePart ? `${datePart}T${timePart}` : datePart ? `${datePart}T` : "";

const formatDateTime = (dateTime: string) =>
  new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(new Date(dateTime));

const parseDateTimeLocal = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const TIME_SLOT_VALUES = (() => {
  const slots = [];
  for (let minutes = 0; minutes < 1440; minutes += TIME_SLOT_INTERVAL_MINUTES) {
    slots.push(`${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`);
  }
  return slots;
})();

function getAvailableTimeSlots(selectedDate: string, minDT: Date, startT?: string | null, endT?: string | null): string[] {
  if (!selectedDate) return [];
  const startMin = startT ? toMinutesFromClock(startT) : null;
  const endMin = endT ? toMinutesFromClock(endT) : null;

  let slots = TIME_SLOT_VALUES.filter((timeValue) => {
    const min = toMinutesFromClock(timeValue);
    if (min === null) return false;
    if (startMin !== null && min < startMin) return false;
    if (endMin !== null && min > endMin) return false;
    const cand = parseDateTimeLocal(combineDateAndTimeLocal(selectedDate, timeValue));
    return cand ? cand.getTime() > minDT.getTime() : false;
  });

  if (startT && !slots.includes(startT.slice(0, 5))) slots.push(startT.slice(0, 5));
  if (endT && !slots.includes(endT.slice(0, 5))) slots.push(endT.slice(0, 5));

  return slots.sort((a, b) => a.localeCompare(b));
}

function buildInitialFormState(): GuestPassFormState {
  const start = new Date(Math.ceil(Date.now() / 1800000) * 1800000);
  return {
    guest_first_name: "",
    guest_last_name: "",
    valid_from: toDateTimeLocalValue(start),
    valid_until: toDateTimeLocalValue(new Date(start.getTime() + 3600000)),
    comment: "",
  };
}

function getHistoryStatusConfig(status: string) {
  return STATUS_BADGE_STYLES[status as keyof typeof STATUS_BADGE_STYLES] || {
    label: status || "Finalizado",
    badgeClass: "bg-gray-100 text-gray-600",
  };
}

function validateForm(state: GuestPassFormState, maxHours: number): GuestPassFormErrors {
  const errors: GuestPassFormErrors = {};
  if (!state.guest_first_name.trim()) errors.guest_first_name = "Nombre obligatorio.";
  if (!state.guest_last_name.trim()) errors.guest_last_name = "Apellidos obligatorios.";
  const start = parseDateTimeLocal(state.valid_from);
  const end = parseDateTimeLocal(state.valid_until);
  if (start && start < new Date()) errors.valid_from = "La fecha no puede ser pasada.";
  if (start && end) {
    if (end <= start) errors.valid_until = "Debe ser posterior al inicio.";
    else if (end.getTime() - start.getTime() > (maxHours * 3600000)) {
      errors.valid_until = `Máximo ${maxHours}h de duración.`;
    }
  }
  return errors;
}

function TimeSelect({ id, selectedDate, selectedTime, slots, disabled, placeholder, emptyMessage, onSelect }: any) {
  if (!selectedDate) return <div className="flex h-10 items-center rounded-xl border border-dashed px-3 text-xs text-slate-400">Elige fecha primero</div>;
  if (slots.length === 0) return <div className="flex h-10 items-center rounded-xl border border-dashed border-amber-300 px-3 text-xs text-amber-700">{emptyMessage}</div>;
  return (
    <Select1 value={slots.includes(selectedTime) ? selectedTime : undefined} onValueChange={onSelect} disabled={disabled}>
      <SelectTrigger id={id} className="h-10 rounded-xl"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent className="max-h-72 rounded-2xl">{slots.map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
    </Select1>
  );
}

function GuestPassCard({ pass, statusLabel, badgeClassName, onCancel, onShowQR, isCancelling = false }: any) {
  return (
    <article className="rounded-xl border border-border/80 bg-white p-4 shadow-sm text-left overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1 text-left min-w-0 flex-1">
          <p className="text-base font-bold text-gray-900 break-words">
            {pass.full_name}
          </p>
          <p className="text-sm text-gray-500">
            Código: <span className="font-mono font-bold text-primary">{pass.pass_code}</span>
          </p>
          {pass.comment && (
            <p className="text-xs text-gray-400 italic break-words mt-1">
              "{pass.comment}"
            </p>
          )}
        </div>
        <Badge className={`w-fit border-none shadow-none font-bold shrink-0 ${badgeClassName}`}>
          <ShieldCheck className="mr-1 h-3.5 w-3.5" />{statusLabel}
        </Badge>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 font-medium text-left">
        <CalendarClock className="h-4 w-4 text-slate-400" /><span>Válido hasta {formatDateTime(pass.valid_until)}</span>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        {onShowQR && <Button type="button" variant="outline" size="sm" onClick={() => onShowQR(pass)} className="rounded-lg font-bold border-primary/30 text-primary hover:bg-primary/5"><QrCode className="w-4 h-4 mr-2" /> Ver QR</Button>}
        {onCancel && <Button type="button" variant="destructive" size="sm" onClick={() => onCancel(pass)} disabled={isCancelling} className="rounded-lg font-bold">{isCancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : "Cancelar pase"}</Button>}
      </div>
    </article>
  );
}

function PassesList({ loading, error, passes, emptyMessage, statusLabel, badgeClassName, isHistory, onRetry, onCancel, onShowQR, cancellingPassId }: any) {
  if (loading) return <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-24 bg-gray-50 animate-pulse rounded-xl" />)}</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center justify-between text-left"><p className="text-sm">{error}</p><Button variant="outline" size="sm" onClick={onRetry}><RefreshCw className="w-4 h-4" /></Button></div>;
  if (passes.length === 0) return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-gray-500 text-left"><Ticket className="h-10 w-10 mx-auto mb-2 opacity-20" /><p className="text-sm">{emptyMessage}</p></div>;

  return (
    <div className="space-y-4">
      {passes.map((pass: GuestPass) => (
        <GuestPassCard
          key={pass.id}
          pass={pass}
          statusLabel={isHistory ? getHistoryStatusConfig(pass.status ?? "").label : statusLabel}
          badgeClassName={isHistory ? getHistoryStatusConfig(pass.status ?? "").badgeClass : badgeClassName}
          onCancel={isHistory ? undefined : onCancel}
          onShowQR={onShowQR}
          isCancelling={cancellingPassId === pass.id}
        />
      ))}
    </div>
  );
}

function GuestPassSection({ title, icon, passes, loading, error, emptyMessage, statusLabel, badgeClassName, isHistory, onRetry, onCancel, onShowQR, cancellingPassId }: any) {
  return (
    <section className="space-y-4">
      <h3 className="text-lg font-bold flex items-center gap-2 text-left">{icon}{title}</h3>
      <PassesList loading={loading} error={error} passes={passes} emptyMessage={emptyMessage} statusLabel={statusLabel} badgeClassName={badgeClassName} isHistory={isHistory} onRetry={onRetry} onCancel={onCancel} onShowQR={onShowQR} cancellingPassId={cancellingPassId} />
    </section>
  );
}

function CreateGuestPassForm({ policy, form, formErrors, isSubmitting, onFieldChange, onSubmit }: any) {
  const { datePart: startDate, timePart: startTime } = splitDateTimeLocal(form.valid_from);
  const now = new Date();
  return (
    <Card className="border-border/80 shadow-sm text-left">
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg font-bold text-gray-900 text-left"><UserRoundPlus className="h-5 w-5 text-primary" /> Nuevo Pase</CardTitle></CardHeader>
      <CardContent><form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5 text-left">
            <Label className="font-bold text-sm">Nombre *</Label>
            <Input value={form.guest_first_name} onChange={
              (e) => onFieldChange("guest_first_name", e.target.value)} required />{formErrors.guest_first_name &&
                <p className="text-[10px] text-red-500 font-bold uppercase">{formErrors.guest_first_name}
                </p>
            }
          </div>
          <div className="grid gap-1.5 text-left"><Label className="font-bold text-sm">Apellidos *</Label><Input value={form.guest_last_name} onChange={(e) => onFieldChange("guest_last_name", e.target.value)} required />{formErrors.guest_last_name && <p className="text-[10px] text-red-500 font-bold uppercase">{formErrors.guest_last_name}</p>}</div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 text-left">
          <div className="grid gap-1.5">
            <Label className="font-bold text-sm">Inicio</Label>
            <div className="flex gap-2">
              <Input
                className={`flex-1 ${formErrors.valid_from ? 'border-red-500' : ''}`}
                type="date"
                value={startDate}
                min={toDateInputValue(now)}
                onChange={(e) => onFieldChange("valid_from", combineDateAndTimeLocal(e.target.value, startTime))}
              />
              <div className="w-32">
                <TimeSelect
                  selectedDate={startDate}
                  selectedTime={startTime}
                  slots={getAvailableTimeSlots(startDate, now, policy?.visit_start_time, policy?.visit_end_time)}
                  onSelect={(t: string) => onFieldChange("valid_from", combineDateAndTimeLocal(startDate, t))}
                />
              </div>
            </div>
            {formErrors.valid_from && <p className="text-[10px] text-red-500 font-bold uppercase mt-1">{formErrors.valid_from}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label className="font-bold text-sm">Fin</Label>
            <div className="flex gap-2">
              <Input
                className={`flex-1 ${formErrors.valid_until ? 'border-red-500' : ''}`}
                type="date"
                value={splitDateTimeLocal(form.valid_until).datePart}
                min={startDate || toDateInputValue(now)}
                onChange={(e) => onFieldChange("valid_until", combineDateAndTimeLocal(e.target.value, splitDateTimeLocal(form.valid_until).timePart))}
              />
              <div className="w-32">
                <TimeSelect
                  selectedDate={splitDateTimeLocal(form.valid_until).datePart}
                  selectedTime={splitDateTimeLocal(form.valid_until).timePart}
                  slots={getAvailableTimeSlots(splitDateTimeLocal(form.valid_until).datePart, parseDateTimeLocal(form.valid_from) || now, policy?.visit_start_time, policy?.visit_end_time)}
                  onSelect={(t: string) => onFieldChange("valid_until", combineDateAndTimeLocal(splitDateTimeLocal(form.valid_until).datePart, t))}
                />
              </div>
            </div>
            {formErrors.valid_until && <p className="text-[10px] text-red-500 font-bold uppercase mt-1">{formErrors.valid_until}</p>}
          </div>
        </div>
        <div className="grid gap-1.5 text-left"><Label className="font-bold text-sm">Comentario (opcional)</Label><Textarea value={form.comment} onChange={(e) => onFieldChange("comment", e.target.value)} rows={2} /></div>
        <Button type="submit" disabled={isSubmitting} className="w-full font-bold h-11">{isSubmitting ? <Loader2 className="animate-spin" /> : <Ticket className="mr-2 h-4 w-4" />} Generar Pase</Button>
      </form></CardContent>
    </Card>
  );
}

export function ActiveGuestPassesPage(props: Readonly<ActiveGuestPassesPageProps>) {
  const { onGoToProfile, onLogout, onNavigate } = props;
  const [activePasses, setActivePasses] = useState<GuestPass[]>([]);
  const [upcomingPasses, setUpcomingPasses] = useState<GuestPass[]>([]);
  const [historyPasses, setHistoryPasses] = useState<GuestPass[]>([]);
  const [policy, setPolicy] = useState<GuestPassPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<GuestPassFormState>(() => buildInitialFormState());
  const [formErrors, setFormErrors] = useState<GuestPassFormErrors>({});
  const [cancellingPassId, setCancellingPassId] = useState<number | null>(null);
  const [passToDeactivate, setPassToDeactivate] = useState<GuestPass | null>(null);
  const [selectedPassForQR, setSelectedPassForQR] = useState<GuestPass | null>(null);

  const loadPasses = useCallback(async () => {
    setLoading(true);
    try {
      const [active, upcoming, history] = await Promise.all([listMyActiveGuestPasses(), listMyUpcomingGuestPasses(), listMyGuestPassHistory()]);
      setActivePasses(active); setUpcomingPasses(upcoming); setHistoryPasses(history); setError(null);
    } catch { setError("No se pudieron cargar los pases."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadPasses(); getMyGuestPassPolicy().then(setPolicy).catch(() => { }); }, [loadPasses]);

  const handleFieldChange = (field: keyof GuestPassFormState, value: string) => {
    setForm((prev: GuestPassFormState) => ({ ...prev, [field]: value }));
    setFormErrors((prev: GuestPassFormErrors) => ({ ...prev, [field]: undefined }));
  };

  const handleCancelPass = (pass: GuestPass) => setPassToDeactivate(pass);

  const handleDelete = async () => {
    if (!passToDeactivate) return;
    setCancellingPassId(passToDeactivate.id);
    try {
      await cancelMyGuestPass(passToDeactivate.id);
      toast.success("Pase cancelado correctamente.");
      setPassToDeactivate(null);
      globalThis.dispatchEvent(new Event(VISIT_STATE_CHANGED_EVENT));
      await loadPasses();
    } catch { toast.error("Error al cancelar."); }
    finally { setCancellingPassId(null); }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const start = parseDateTimeLocal(form.valid_from);
    const end = parseDateTimeLocal(form.valid_until);

    if (!start || !end) return;

    // Validar duración y fechas antes de enviar
    const vErrors = validateForm(form, policy?.max_duration_hours ?? DEFAULT_MAX_DURATION_HOURS);
    if (Object.keys(vErrors).length > 0) {
      setFormErrors(vErrors);
      toast.error("Revisa los límites de duración del pase.");
      return;
    }

    // REVISIÓN DE LÍMITE POR DÍA
    const limit = policy?.max_concurrent_passes ?? DEFAULT_MAX_CONCURRENT_PASSES;
    const { datePart: targetDate } = splitDateTimeLocal(form.valid_from);

    const passesOnSameDay = [...activePasses, ...upcomingPasses].filter(p => {
      const { datePart: pDate } = splitDateTimeLocal(toDateTimeLocalValue(new Date(p.valid_from)));
      return pDate === targetDate;
    });

    if (passesOnSameDay.length >= limit) {
      toast.error(`Límite alcanzado: No puedes crear más de ${limit} pases para el día ${targetDate}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await createMyGuestPass({
        guest_first_name: form.guest_first_name.trim(),
        guest_last_name: form.guest_last_name.trim(),
        valid_from: start.toISOString(),
        valid_until: end.toISOString(),
        comment: form.comment.trim()
      });
      toast.success("Pase creado con éxito.");
      setForm(buildInitialFormState());
      await loadPasses();
    } catch (err: any) {
      if (err instanceof GuestPassApiError) setFormErrors(err.fieldErrors);
      toast.error(err.message || "Error al crear el pase.");
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="flex flex-col w-full bg-background min-h-screen text-left">
      <header className="bg-primary p-6 pt-12 flex justify-between items-center shrink-0 shadow-lg sticky top-0 z-20 text-left">
        <h1 className="text-primary-foreground text-2xl font-bold text-left">Pases de Invitados</h1>
        <div className="flex items-center gap-2">
          <NotificationBell onNavigate={onNavigate} />
          <Button size="icon" variant="ghost" className="text-primary-foreground rounded-full" onClick={() => onGoToProfile?.()}><User className="w-5 h-5" /></Button>
          {onLogout && <Button size="icon" variant="ghost" className="text-primary-foreground rounded-full" onClick={onLogout}><LogOut className="w-5 h-5" /></Button>}
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-4xl flex-col gap-8 pb-24 pt-6 px-4 text-left">
        <header className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-6 text-left">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 text-left">Gestión de pases</h2>
          <p className="mt-1 text-sm text-gray-500 text-left">Administra el acceso de tus invitados (Máximo {policy?.max_concurrent_passes ?? DEFAULT_MAX_CONCURRENT_PASSES}) por día.</p>
        </header>

        <CreateGuestPassForm policy={policy} form={form} formErrors={formErrors} isSubmitting={isSubmitting} onFieldChange={handleFieldChange} onSubmit={handleSubmit} />

        <div className="space-y-10">
          <GuestPassSection title="Pases activos" icon={<Ticket className="w-5 h-5 text-emerald-500" />} passes={activePasses} loading={loading} error={error} emptyMessage="Sin pases activos." statusLabel="Activo" badgeClassName="bg-emerald-100 text-emerald-700" onRetry={loadPasses} onCancel={handleCancelPass} cancellingPassId={cancellingPassId} onShowQR={(p: GuestPass) => setSelectedPassForQR(p)} />
          <GuestPassSection title="Pases próximos" icon={<CalendarClock className="w-5 h-5 text-blue-500" />} passes={upcomingPasses} loading={loading} error={error} emptyMessage="Sin pases programados." statusLabel="Próximo" badgeClassName="bg-blue-100 text-blue-700" onRetry={loadPasses} onCancel={handleCancelPass} cancellingPassId={cancellingPassId} onShowQR={undefined} />
          <GuestPassSection title="Historial" icon={<History className="w-5 h-5 opacity-50" />} passes={historyPasses} loading={loading} error={error} emptyMessage="Historial vacío." isHistory onRetry={loadPasses} onShowQR={undefined} />
        </div>

        <Dialog open={!!selectedPassForQR} onOpenChange={() => setSelectedPassForQR(null)}>
          <DialogContent className="max-w-[400px] rounded-3xl p-6 flex flex-col items-center border-none shadow-2xl">
            <DialogTitle className="text-center text-xl font-bold mb-1 text-gray-900">Pase de Acceso</DialogTitle>
            <DialogDescription className="text-center text-gray-500 mb-6 font-medium break-words w-full">
              Invitado: <span className="text-gray-900 font-bold">{selectedPassForQR?.full_name}</span>
            </DialogDescription>
            <div className="bg-white p-4 rounded-2xl border-2 border-primary/20 mb-6 shadow-inner">{selectedPassForQR && <QRCodeSVG value={selectedPassForQR.pass_code} size={200} level="H" includeMargin={true} />}</div>
            <div className="w-full bg-slate-50 rounded-2xl p-4 text-center mb-6 border border-slate-100">
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1 text-center">Código Numérico</p>
              <p className="text-3xl font-mono font-black text-primary tracking-[0.4em] text-center">{selectedPassForQR?.pass_code}</p>
            </div>
            <div className="flex gap-3 w-full">
              <Button className="flex-1 rounded-xl h-12 font-bold bg-primary" onClick={() => setSelectedPassForQR(null)}>CERRAR</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!passToDeactivate} onOpenChange={() => !cancellingPassId && setPassToDeactivate(null)}>
          <DialogContent className="max-w-[400px] rounded-3xl p-8 text-center border-none shadow-2xl overflow-hidden">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6"><ShieldAlert size={32} /></div>
            <DialogTitle className="text-2xl font-bold text-gray-900 text-center">¿Anular pase?</DialogTitle>
            <DialogDescription className="mt-3 text-gray-500 font-medium text-center break-words"> {/* break-words aquí */}
              Se invalidará el acceso para <span className="font-bold text-gray-900">{passToDeactivate?.full_name}</span>.
            </DialogDescription>
            <div className="flex gap-3 mt-8">
              <Button variant="outline" onClick={() => setPassToDeactivate(null)} disabled={!!cancellingPassId} className="flex-1 rounded-xl h-12 font-bold">Volver</Button>
              <Button variant="destructive" onClick={handleDelete} disabled={!!cancellingPassId} className="flex-1 rounded-xl h-12 font-bold">{cancellingPassId ? <Loader2 className="animate-spin" /> : "Confirmar"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}

export default ActiveGuestPassesPage;