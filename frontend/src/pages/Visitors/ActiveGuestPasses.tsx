import { CalendarClock, RefreshCw, ShieldCheck, Ticket } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { type GuestPass, listMyActiveGuestPasses } from "../../services/guestPasses";

function formatDateTime(dateTime: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateTime));
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

function EmptyState() {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center text-muted-foreground">
        <Ticket className="h-12 w-12 opacity-40" />
        <p className="text-sm">No tienes pases de invitados activos en este momento.</p>
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

function GuestPassCard({ pass }: { pass: GuestPass }) {
  return (
    <article className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-base font-semibold text-foreground">{pass.full_name}</p>
          <p className="text-sm text-muted-foreground">
            Código: <span className="font-mono font-medium text-foreground">{pass.pass_code}</span>
          </p>
        </div>

        <Badge className="w-fit border-none bg-[#35C759]/10 text-[#35C759] shadow-none hover:bg-[#35C759]/10">
          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
          Activo
        </Badge>
      </div>

      <div className="mt-4 flex flex-col gap-1.5 text-sm text-muted-foreground">
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
  const [passes, setPasses] = useState<GuestPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMyActiveGuestPasses();
      setPasses(data);
    } catch (unknownError) {
      const message =
        unknownError instanceof Error
          ? unknownError.message
          : "No se pudo cargar el listado de pases activos.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPasses();
  }, [loadPasses]);

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-24">
      <header className="rounded-xl border border-border/80 bg-card p-4 shadow-sm sm:p-6">
        <h2 className="text-2xl font-bold tracking-tight">Pases de invitados activos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulta qué invitados tienen autorización activa de acceso ahora mismo.
        </p>
      </header>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void loadPasses()} />
      ) : passes.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {passes.map((pass) => (
            <GuestPassCard key={pass.id} pass={pass} />
          ))}
        </div>
      )}
    </section>
  );
}

export default ActiveGuestPassesPage;
