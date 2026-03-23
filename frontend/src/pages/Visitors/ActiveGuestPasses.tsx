import { CalendarClock, RefreshCw, ShieldCheck, Ticket, UserRoundPlus } from "lucide-react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  createMyGuestPass,
  GuestPassApiError,
  type GuestPass,
  type GuestPassPolicy,
  getMyGuestPassPolicy,
  listMyActiveGuestPasses,
  listMyUpcomingGuestPasses,
} from "../../services/guestPasses";

const DEFAULT_MAX_DURATION_HOURS = 24;
const DEFAULT_MAX_CONCURRENT_PASSES = 3;

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

function buildInitialFormState(): GuestPassFormState {
  const start = new Date();
  const roundedMinutes = Math.ceil(start.getMinutes() / 5) * 5;
  start.setMinutes(roundedMinutes, 0, 0);
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

function EmptyState({ message }: { message: string }) {
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
  message: string;
  onRetry: () => void;
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

function GuestPassCard({
  pass,
  statusLabel,
  badgeClassName,
}: {
  pass: GuestPass;
  statusLabel: string;
  badgeClassName: string;
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

export function ActiveGuestPassesPage() {
  const [activePasses, setActivePasses] = useState<GuestPass[]>([]);
  const [upcomingPasses, setUpcomingPasses] = useState<GuestPass[]>([]);
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
      const [active, upcoming] = await Promise.all([
        listMyActiveGuestPasses(),
        listMyUpcomingGuestPasses(),
      ]);
      setActivePasses(active);
      setUpcomingPasses(upcoming);
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
      {/* Header */}
      <header className="bg-primary p-6 pt-12 flex justify-between items-center shrink-0 shadow-lg sticky top-0 z-20">
        <h1 className="text-primary-foreground text-2xl font-bold">Pases de Invitados</h1>
      </header>
      
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-24 pt-6 px-4">
      <header className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-6">
        <h2 className="text-2xl font-bold tracking-tight">Gestión de pases de invitados</h2>
        <p className="mt-1 text-sm text-gray-500">
          Crea nuevos pases para tus invitados y consulta los activos y los próximos.
        </p>
      </header>

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
            Configuración actual: duración máxima{" "}
            <strong>{policy?.max_duration_hours ?? DEFAULT_MAX_DURATION_HOURS}h</strong> y
            máximo <strong>{policy?.max_concurrent_passes ?? DEFAULT_MAX_CONCURRENT_PASSES}</strong>{" "}
            pases concurrentes.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="guest-first-name">Nombre del invitado</Label>
                <Input
                  id="guest-first-name"
                  value={form.guest_first_name}
                  onChange={(event) => setField("guest_first_name", event.target.value)}
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
                  onChange={(event) => setField("guest_last_name", event.target.value)}
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
                <Label htmlFor="guest-valid-from">Fecha/hora inicio</Label>
                <Input
                  id="guest-valid-from"
                  type="datetime-local"
                  value={form.valid_from}
                  onChange={(event) => setField("valid_from", event.target.value)}
                  aria-invalid={Boolean(formErrors.valid_from)}
                  required
                />
                {formErrors.valid_from ? (
                  <p className="text-xs text-red-600">{formErrors.valid_from}</p>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="guest-valid-until">Fecha/hora fin</Label>
                <Input
                  id="guest-valid-until"
                  type="datetime-local"
                  value={form.valid_until}
                  onChange={(event) => setField("valid_until", event.target.value)}
                  aria-invalid={Boolean(formErrors.valid_until)}
                  required
                />
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
                onChange={(event) => setField("comment", event.target.value)}
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

      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Pases activos</h3>
          <Button type="button" variant="outline" onClick={() => void loadPasses()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
        </header>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void loadPasses()} />
        ) : activePasses.length === 0 ? (
          <EmptyState message="No tienes pases de invitados activos en este momento." />
        ) : (
          <div className="space-y-4">
            {activePasses.map((pass) => (
              <GuestPassCard
                key={pass.id}
                pass={pass}
                statusLabel="Activo"
                badgeClassName="bg-primary/10 text-primary hover:bg-primary/10"
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <header>
          <h3 className="text-lg font-semibold">Pases próximos</h3>
          <p className="text-sm text-gray-500">
            Pases ya creados que comenzarán en el futuro.
          </p>
        </header>

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void loadPasses()} />
        ) : upcomingPasses.length === 0 ? (
          <EmptyState message="No tienes pases de invitados programados próximamente." />
        ) : (
          <div className="space-y-4">
            {upcomingPasses.map((pass) => (
              <GuestPassCard
                key={pass.id}
                pass={pass}
                statusLabel="Próximo"
                badgeClassName="bg-accent/20 text-accent-foreground hover:bg-accent/20"
              />
            ))}
          </div>
        )}
      </section>
    </section>
    </div>
  );
}

export default ActiveGuestPassesPage;
