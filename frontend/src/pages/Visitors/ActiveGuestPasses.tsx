import { CalendarClock, History, LogOut, RefreshCw, ShieldCheck, Ticket, User, UserRoundPlus } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select1, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { NotificationBell } from "../../components/announcement/NotificationBell";
import {
  createMyGuestPass,
  GuestPassApiError,
  type GuestPass,
  type GuestPassPolicy,
  getMyGuestPassPolicy,
  listMyActiveGuestPasses,
  listMyUpcomingGuestPasses,
  listMyGuestPassHistory,
} from "../../services/guestPasses";

const DEFAULT_MAX_DURATION_HOURS = 24;
const DEFAULT_MAX_CONCURRENT_PASSES = 3;
const TIME_SLOT_INTERVAL_MINUTES = 30;

type GuestPassFormState = {
  guest_first_name: string;
  guest_last_name: string;
  valid_from: string;
  valid_until: string;
  comment: string;
};

type GuestPassFormErrors = Partial<Record<keyof GuestPassFormState, string>>;

function toDateTimeLocalValue(date: Date): string {
  const localDate = new Date(date);
  localDate.setSeconds(0, 0);
  const timezoneOffsetMs = localDate.getTimezoneOffset() * 60 * 1000;
  const normalized = new Date(localDate.getTime() - timezoneOffsetMs);
  return normalized.toISOString().slice(0, 16);
}

function toDateInputValue(date: Date): string {
  return toDateTimeLocalValue(date).slice(0, 10);
}

function splitDateTimeLocal(value: string): { datePart: string; timePart: string } {
  if (!value) {
    return { datePart: "", timePart: "" };
  }
  const [datePart = "", timePart = ""] = value.split("T");
  return { datePart, timePart: timePart.slice(0, 5) };
}

function combineDateAndTimeLocal(datePart: string, timePart: string): string {
  if (!datePart) {
    return "";
  }
  if (!timePart) {
    return `${datePart}T`;
  }
  return `${datePart}T${timePart}`;
}

function buildTimeSlotValues(slotMinutes: number): string[] {
  const slots: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += slotMinutes) {
    const hourPart = String(Math.floor(minutes / 60)).padStart(2, "0");
    const minutePart = String(minutes % 60).padStart(2, "0");
    slots.push(`${hourPart}:${minutePart}`);
  }
  return slots;
}

const TIME_SLOT_VALUES = buildTimeSlotValues(TIME_SLOT_INTERVAL_MINUTES);

function getAvailableTimeSlots(selectedDate: string, minDateTimeExclusive: Date): string[] {
  if (!selectedDate) {
    return [];
  }

  return TIME_SLOT_VALUES.filter((timeValue) => {
    const candidateDate = parseDateTimeLocal(combineDateAndTimeLocal(selectedDate, timeValue));
    if (!candidateDate) {
      return false;
    }
    return candidateDate.getTime() > minDateTimeExclusive.getTime();
  });
}

function buildInitialFormState(): GuestPassFormState {
  const slotMs = TIME_SLOT_INTERVAL_MINUTES * 60 * 1000;
  const start = new Date(Math.ceil(Date.now() / slotMs) * slotMs);
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  return {
    guest_first_name: "",
    guest_last_name: "",
    valid_from: toDateTimeLocalValue(start),
    valid_until: toDateTimeLocalValue(end),
    comment: "",
  };
}

function formatDateTime(dateTime: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateTime));
}

function parseDateTimeLocal(value: string): Date | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function validateForm(
  state: GuestPassFormState,
  maxDurationHours: number
): GuestPassFormErrors {
  const errors: GuestPassFormErrors = {};
  const maxDurationMs = maxDurationHours * 60 * 60 * 1000;
  const now = new Date();

  if (!state.guest_first_name.trim()) {
    errors.guest_first_name = "El nombre del invitado es obligatorio.";
  }
  if (!state.guest_last_name.trim()) {
    errors.guest_last_name = "Los apellidos del invitado son obligatorios.";
  }
  if (!state.valid_from) {
    errors.valid_from = "La fecha/hora de inicio es obligatoria.";
  }
  if (!state.valid_until) {
    errors.valid_until = "La fecha/hora de fin es obligatoria.";
  }

  const start = parseDateTimeLocal(state.valid_from);
  const end = parseDateTimeLocal(state.valid_until);

  if (state.valid_from && !start) {
    errors.valid_from = "Formato de fecha/hora de inicio inválido.";
  }
  if (state.valid_until && !end) {
    errors.valid_until = "Formato de fecha/hora de fin inválido.";
  }

  if (start && end) {
    if (start < now) {
      errors.valid_from = "La fecha/hora de inicio no puede ser anterior al momento actual.";
    }
    if (end < now) {
      errors.valid_until = "La fecha/hora de fin no puede ser anterior al momento actual.";
    }
    if (end <= start) {
      errors.valid_until = "La fecha/hora de fin debe ser posterior a la de inicio.";
    } else if (end.getTime() - start.getTime() > maxDurationMs) {
      errors.valid_until = `La duración máxima del pase es de ${maxDurationHours} horas.`;
    }
  }

  return errors;
}

function LoadingState() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-28 rounded-xl border border-gray-200 bg-gray-50 animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ message }: { readonly message: string }) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center text-gray-500">
        <Ticket className="h-12 w-12 opacity-40" />
        <p className="text-sm">{message}</p>
      </CardContent>
    </Card>
  );
}

interface ErrorStateProps {
  readonly message: string;
  readonly onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-destructive">{message}</p>
        <Button type="button" variant="outline" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Reintentar
        </Button>
      </CardContent>
    </Card>
  );
}

const STATUS_BADGE_STYLES = {
  ACTIVE: { label: "Inactivo", badgeClass: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100" },
  USED: { label: "Usado", badgeClass: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
  CANCELLED: { label: "Cancelado", badgeClass: "bg-gray-100 text-gray-600 hover:bg-gray-100" },
  REVOKED: { label: "Revocado", badgeClass: "bg-red-100 text-red-700 hover:bg-red-100" },
  REJECTED: { label: "Rechazado", badgeClass: "bg-orange-100 text-orange-700 hover:bg-orange-100" },
  INACTIVE: { label: "Inactivo", badgeClass: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100" },
};

function getHistoryStatusConfig(status: string) {
  return STATUS_BADGE_STYLES[status as keyof typeof STATUS_BADGE_STYLES] || {
    label: status || "Desconocido",
    badgeClass: "bg-gray-100 text-gray-600 hover:bg-gray-100",
  };
}

function GuestPassCard({
  pass,
  statusLabel,
  badgeClassName,
}: {
  readonly pass: GuestPass;
  readonly statusLabel: string;
  readonly badgeClassName: string;
}) {
  return (
    <article className="rounded-xl border border-border/80 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-base font-semibold text-gray-900">{pass.full_name}</p>
          <p className="text-sm text-gray-500">
            Código: <span className="font-mono font-medium text-gray-900">{pass.pass_code}</span>
          </p>
          {pass.comment ? <p className="text-sm text-gray-500">Motivo: {pass.comment}</p> : null}
        </div>

        <Badge className={`w-fit border-none shadow-none ${badgeClassName}`}>
          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
          {statusLabel}
        </Badge>
      </div>

      <div className="mt-4 flex flex-col gap-1.5 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          <span>
            Válido desde {formatDateTime(pass.valid_from)} hasta {formatDateTime(pass.valid_until)}
          </span>
        </div>
      </div>
    </article>
  );
}

interface PassesListProps {
  readonly loading: boolean;
  readonly error: string | null;
  readonly passes: GuestPass[];
  readonly emptyMessage: string;
  readonly statusLabel: string;
  readonly badgeClassName: string;
  readonly isHistory?: boolean;
  readonly onRetry?: () => void;
}

function PassesList({
  loading,
  error,
  passes,
  emptyMessage,
  statusLabel,
  badgeClassName,
  isHistory = false,
  onRetry,
}: PassesListProps) {
  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry || (() => {})} />;
  }

  if (passes.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="space-y-4">
      {passes.map((pass) => {
        const finalStatusLabel = isHistory ? getHistoryStatusConfig(pass.status).label : statusLabel;
        const finalBadgeClass = isHistory ? getHistoryStatusConfig(pass.status).badgeClass : badgeClassName;
        return (
          <GuestPassCard
            key={pass.id}
            pass={pass}
            statusLabel={finalStatusLabel}
            badgeClassName={finalBadgeClass}
          />
        );
      })}
    </div>
  );
}

interface GuestPassSectionProps {
  readonly title: string;
  readonly description?: string;
  readonly icon?: React.ReactNode;
  readonly passes: GuestPass[];
  readonly loading: boolean;
  readonly error: string | null;
  readonly emptyMessage: string;
  readonly statusLabel: string;
  readonly badgeClassName: string;
  readonly isHistory?: boolean;
  readonly onRetry: () => void;
  readonly onRefresh?: () => void;
}

interface TimeSelectProps {
  readonly id: string;
  readonly selectedDate: string;
  readonly selectedTime: string;
  readonly slots: string[];
  readonly disabled?: boolean;
  readonly placeholder: string;
  readonly emptyMessage: string;
  readonly onSelect: (timeValue: string) => void;
}

function TimeSelect({
  id,
  selectedDate,
  selectedTime,
  slots,
  disabled = false,
  placeholder,
  emptyMessage,
  onSelect,
}: TimeSelectProps) {
  if (!selectedDate) {
    return (
      <div className="flex h-10 items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">
        Selecciona una fecha primero
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="flex h-10 items-center rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3 text-sm text-amber-700">
        {emptyMessage}
      </div>
    );
  }

  return (
    <Select1
      value={slots.includes(selectedTime) ? selectedTime : undefined}
      onValueChange={onSelect}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        className="h-10 rounded-xl border-slate-200 bg-white/95 px-3 shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus:ring-2 focus:ring-primary/20 data-[state=open]:border-primary data-[state=open]:ring-primary/10"
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72 rounded-2xl border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur">
        {slots.map((timeValue) => (
          <SelectItem
            key={timeValue}
            value={timeValue}
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 focus:bg-primary/10 focus:text-primary"
          >
            {timeValue}
          </SelectItem>
        ))}
      </SelectContent>
    </Select1>
  );
}

function GuestPassSection({
  title,
  description,
  icon,
  passes,
  loading,
  error,
  emptyMessage,
  statusLabel,
  badgeClassName,
  isHistory = false,
  onRetry,
  onRefresh,
}: GuestPassSectionProps) {
  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            {icon}
            {title}
          </h3>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {onRefresh ? (
          <Button type="button" variant="outline" onClick={onRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        ) : null}
      </header>
      <PassesList
        loading={loading}
        error={error}
        passes={passes}
        emptyMessage={emptyMessage}
        statusLabel={statusLabel}
        badgeClassName={badgeClassName}
        isHistory={isHistory}
        onRetry={onRetry}
      />
    </section>
  );
}

function CreateGuestPassForm({
  policy,
  form,
  formErrors,
  isSubmitting,
  onFieldChange,
  onSubmit,
}: {
  readonly policy: GuestPassPolicy | null;
  readonly form: GuestPassFormState;
  readonly formErrors: GuestPassFormErrors;
  readonly isSubmitting: boolean;
  readonly onFieldChange: <K extends keyof GuestPassFormState>(field: K, value: GuestPassFormState[K]) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const maxDuration = policy?.max_duration_hours ?? DEFAULT_MAX_DURATION_HOURS;
  const maxConcurrent = policy?.max_concurrent_passes ?? DEFAULT_MAX_CONCURRENT_PASSES;
  const now = new Date();
  const todayDate = toDateInputValue(now);

  const { datePart: startDate, timePart: startTime } = splitDateTimeLocal(form.valid_from);
  const { datePart: endDate, timePart: endTime } = splitDateTimeLocal(form.valid_until);

  const startTimeOptions = getAvailableTimeSlots(startDate, now);
  const parsedStart = parseDateTimeLocal(form.valid_from);
  const minEndDateTime =
    parsedStart && parsedStart.getTime() > now.getTime() ? parsedStart : now;
  const endTimeOptions = getAvailableTimeSlots(endDate, minEndDateTime);
  const minEndDate = startDate || todayDate;

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <UserRoundPlus className="h-5 w-5" />
          Crear nuevo pase
        </CardTitle>
        <CardDescription>
          El pase se aprueba automáticamente si cumple las reglas de duración y concurrencia.
        </CardDescription>
        <p className="text-xs text-gray-500">
          Configuración actual: duración máxima <strong>{maxDuration}h</strong> y máximo{" "}
          <strong>{maxConcurrent}</strong> pases concurrentes.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="guest-first-name">Nombre del invitado</Label>
              <Input
                id="guest-first-name"
                value={form.guest_first_name}
                onChange={(event) => onFieldChange("guest_first_name", event.target.value)}
                aria-invalid={Boolean(formErrors.guest_first_name)}
                maxLength={100}
                required
              />
              {formErrors.guest_first_name ? (
                <p className="text-xs text-red-600">{formErrors.guest_first_name}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="guest-last-name">Apellidos del invitado</Label>
              <Input
                id="guest-last-name"
                value={form.guest_last_name}
                onChange={(event) => onFieldChange("guest_last_name", event.target.value)}
                aria-invalid={Boolean(formErrors.guest_last_name)}
                maxLength={100}
                required
              />
              {formErrors.guest_last_name ? (
                <p className="text-xs text-red-600">{formErrors.guest_last_name}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="guest-valid-from-date">Fecha/hora inicio</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  id="guest-valid-from-date"
                  type="date"
                  value={startDate}
                  min={todayDate}
                  onChange={(event) => {
                    const nextDate = event.target.value;
                    const availableTimes = getAvailableTimeSlots(nextDate, new Date());
                    const nextTime = availableTimes.includes(startTime)
                      ? startTime
                      : (availableTimes[0] ?? "");
                    onFieldChange("valid_from", combineDateAndTimeLocal(nextDate, nextTime));
                  }}
                  aria-invalid={Boolean(formErrors.valid_from)}
                  required
                />
                <TimeSelect
                  id="guest-valid-from-time"
                  selectedDate={startDate}
                  selectedTime={startTimeOptions.includes(startTime) ? startTime : ""}
                  slots={startTimeOptions}
                  disabled={!startDate}
                  placeholder="Selecciona hora"
                  emptyMessage="Sin horas disponibles para este día."
                  onSelect={(timeValue) =>
                    onFieldChange("valid_from", combineDateAndTimeLocal(startDate, timeValue))
                  }
                />
              </div>
              {startDate && startTimeOptions.length === 0 ? (
                <p className="text-xs text-amber-700">
                  No quedan horas futuras para esta fecha. Selecciona otro día.
                </p>
              ) : null}
              {formErrors.valid_from ? (
                <p className="text-xs text-red-600">{formErrors.valid_from}</p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="guest-valid-until-date">Fecha/hora fin</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  id="guest-valid-until-date"
                  type="date"
                  value={endDate}
                  min={minEndDate}
                  onChange={(event) => {
                    const nextDate = event.target.value;
                    const latestNow = new Date();
                    const latestStart = parseDateTimeLocal(form.valid_from);
                    const minDateTime =
                      latestStart && latestStart.getTime() > latestNow.getTime()
                        ? latestStart
                        : latestNow;
                    const availableTimes = getAvailableTimeSlots(nextDate, minDateTime);
                    const nextTime = availableTimes.includes(endTime)
                      ? endTime
                      : (availableTimes[0] ?? "");
                    onFieldChange("valid_until", combineDateAndTimeLocal(nextDate, nextTime));
                  }}
                  aria-invalid={Boolean(formErrors.valid_until)}
                  required
                />
                <TimeSelect
                  id="guest-valid-until-time"
                  selectedDate={endDate}
                  selectedTime={endTimeOptions.includes(endTime) ? endTime : ""}
                  slots={endTimeOptions}
                  disabled={!endDate}
                  placeholder="Selecciona hora"
                  emptyMessage="Sin horas disponibles para este rango."
                  onSelect={(timeValue) =>
                    onFieldChange("valid_until", combineDateAndTimeLocal(endDate, timeValue))
                  }
                />
              </div>
              {endDate && endTimeOptions.length === 0 ? (
                <p className="text-xs text-amber-700">
                  No hay horas válidas para esta fecha y rango. Ajusta inicio o elige otro día.
                </p>
              ) : null}
              {formErrors.valid_until ? (
                <p className="text-xs text-red-600">{formErrors.valid_until}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="guest-comment">Motivo o comentario (opcional)</Label>
            <Textarea
              id="guest-comment"
              value={form.comment}
              onChange={(event) => onFieldChange("comment", event.target.value)}
              aria-invalid={Boolean(formErrors.comment)}
              maxLength={500}
              rows={3}
            />
            {formErrors.comment ? (
              <p className="text-xs text-red-600">{formErrors.comment}</p>
            ) : null}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creando..." : "Crear pase"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface ActiveGuestPassesPageProps {
  onGoToProfile?: () => void;
  onLogout?: () => void;
}

export function ActiveGuestPassesPage({ onGoToProfile, onLogout }: ActiveGuestPassesPageProps) {
  const [activePasses, setActivePasses] = useState<GuestPass[]>([]);
  const [upcomingPasses, setUpcomingPasses] = useState<GuestPass[]>([]);
  const [historyPasses, setHistoryPasses] = useState<GuestPass[]>([]);
  const [policy, setPolicy] = useState<GuestPassPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<GuestPassFormState>(() => buildInitialFormState());
  const [formErrors, setFormErrors] = useState<GuestPassFormErrors>({});

  const loadPasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [active, upcoming, history] = await Promise.all([
        listMyActiveGuestPasses(),
        listMyUpcomingGuestPasses(),
        listMyGuestPassHistory(),
      ]);
      setActivePasses(active);
      setUpcomingPasses(upcoming);
      setHistoryPasses(history);
    } catch (unknownError) {
      const message =
        unknownError instanceof Error
          ? unknownError.message
          : "No se pudieron cargar los pases de invitados.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPasses();
  }, [loadPasses]);

  useEffect(() => {
    const loadPolicy = async () => {
      try {
        const data = await getMyGuestPassPolicy();
        setPolicy(data);
      } catch {
        setPolicy({
          max_duration_hours: DEFAULT_MAX_DURATION_HOURS,
          max_concurrent_passes: DEFAULT_MAX_CONCURRENT_PASSES,
        });
      }
    };
    void loadPolicy();
  }, []);

  const setField = <K extends keyof GuestPassFormState,>(field: K, value: GuestPassFormState[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setFormErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const maxDurationHours = policy?.max_duration_hours ?? DEFAULT_MAX_DURATION_HOURS;
    const validationErrors = validateForm(form, maxDurationHours);
    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      toast.error("Revisa los campos del formulario.");
      return;
    }

    const start = parseDateTimeLocal(form.valid_from);
    const end = parseDateTimeLocal(form.valid_until);
    if (!start || !end) {
      toast.error("Formato de fecha/hora inválido.");
      return;
    }

    setIsSubmitting(true);
    setFormErrors({});

    try {
      const created = await createMyGuestPass({
        guest_first_name: form.guest_first_name.trim(),
        guest_last_name: form.guest_last_name.trim(),
        valid_from: start.toISOString(),
        valid_until: end.toISOString(),
        comment: form.comment.trim(),
      });

      toast.success("Pase creado correctamente.", {
        description: `Código asignado: ${created.pass_code}`,
      });

      setForm(buildInitialFormState());
      await loadPasses();
    } catch (unknownError) {
      if (unknownError instanceof GuestPassApiError) {
        setFormErrors((unknownError.fieldErrors || {}) as GuestPassFormErrors);
        toast.error(unknownError.message);
      } else {
        toast.error("No se pudo crear el pase de invitado.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full bg-background">
      <header className="bg-primary p-6 pt-12 flex justify-between items-center shrink-0 shadow-lg sticky top-0 z-20">
        <h1 className="text-primary-foreground text-2xl font-bold">Pases de Invitados</h1>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button
            size="icon"
            variant="ghost"
            className="text-primary-foreground hover:bg-primary-foreground/20 hover:scale-110 rounded-full transition-all"
            onClick={() => onGoToProfile?.()}
            aria-label="Ir al perfil"
          >
            <User className="w-5 h-5" />
          </Button>
          {onLogout ? (
            <Button
              size="icon"
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/20 hover:scale-110 rounded-full transition-all"
              onClick={onLogout}
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          ) : null}
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-24 pt-6 px-4">
        <header className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-6">
          <h2 className="text-2xl font-bold tracking-tight">Gestión de pases de invitados</h2>
          <p className="mt-1 text-sm text-gray-500">
            Crea nuevos pases para tus invitados y consulta los activos y los próximos.
          </p>
        </header>

        <CreateGuestPassForm
          policy={policy}
          form={form}
          formErrors={formErrors}
          isSubmitting={isSubmitting}
          onFieldChange={setField}
          onSubmit={handleSubmit}
        />

        <GuestPassSection
          title="Pases activos"
          passes={activePasses}
          loading={loading}
          error={error}
          emptyMessage="No tienes pases de invitados activos en este momento."
          statusLabel="Activo"
          badgeClassName="bg-primary/10 text-primary hover:bg-primary/10"
          onRetry={() =>  loadPasses()}
          onRefresh={() =>  loadPasses()}
        />

        <GuestPassSection
          title="Pases próximos"
          description="Pases ya creados que comenzarán en el futuro."
          passes={upcomingPasses}
          loading={loading}
          error={error}
          emptyMessage="No tienes pases de invitados programados próximamente."
          statusLabel="Próximo"
          badgeClassName="bg-accent/20 text-accent-foreground hover:bg-accent/20"
          onRetry={() =>  loadPasses()}
        />

        <GuestPassSection
          title="Historial de pases"
          description="Pases completados, cancelados, revocados y otros estados históricos."
          icon={<History className="h-5 w-5 text-muted-foreground" />}
          passes={historyPasses}
          loading={loading}
          error={error}
          emptyMessage="No tienes historial de pases de invitados."
          statusLabel=""
          badgeClassName=""
          isHistory={true}
          onRetry={() =>  loadPasses()}
        />
      </section>
    </div>
  );
}

export default ActiveGuestPassesPage
