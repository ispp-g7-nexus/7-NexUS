import { useState } from "react";
import { AlertCircle, CheckCircle, XCircle, Calendar, Eye, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ObjectRental } from "../services/objects";

const ADMIN_CANCELLATION_REASON_MAX_LENGTH = 200;
const REASON_PREVIEW_CHARS = 140;

function normalizeReasonText(value: string): string {
  const normalizedLines = value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd());

  const compactLines: string[] = [];
  let previousWasBlank = false;

  for (const line of normalizedLines) {
    const isBlank = line.trim().length === 0;
    if (isBlank) {
      if (!previousWasBlank) {
        compactLines.push("");
      }
      previousWasBlank = true;
      continue;
    }

    compactLines.push(line);
    previousWasBlank = false;
  }

  return compactLines.join("\n").trim();
}

function buildReasonPreview(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value;
  }
  return `${value.slice(0, maxChars).trimEnd()}...`;
}

function getRentalStatusLabel(rental: ObjectRental): string {
  const overdueInProgress = rental.status === "IN_PROGRESS" && new Date(rental.end_date).getTime() <= Date.now();
  if (overdueInProgress) return "Con retraso";
  if (rental.status === "ACTIVE") return "Reservada";
  if (rental.status === "IN_PROGRESS") return "En curso";
  if (rental.status === "COMPLETED") return rental.is_overdue ? "Finalizada con retraso" : "Finalizada";
  if (rental.status === "CANCELLED") return "Cancelada";
  return rental.status;
}

interface RentalsByStatus {
  active: ObjectRental[];
  in_progress: ObjectRental[];
  cancelled: ObjectRental[];
  completed: ObjectRental[];
}

interface RentalHistoryViewProps {
  rentalsByStatus: RentalsByStatus;
  loading: boolean;
  onMarkReturned?: (rental: ObjectRental) => Promise<void>;
  onCancelRental?: (rental: ObjectRental, reason: string) => Promise<void>;
  completingRentalIds?: number[];
  cancellingRentalIds?: number[];
}

function formatDate(date: string): string {
  const d = new Date(date);
  const formatter = new Intl.DateTimeFormat("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return formatter.format(d);
}

function RentalCard({
  rental,
  status,
  onMarkReturned,
  onCancelRental,
  isCompleting,
  isCancelling,
}: {
  rental: ObjectRental;
  status: "ACTIVE" | "IN_PROGRESS" | "CANCELLED" | "COMPLETED";
  onMarkReturned?: (rental: ObjectRental) => Promise<void>;
  onCancelRental?: (rental: ObjectRental, reason: string) => Promise<void>;
  isCompleting?: boolean;
  isCancelling?: boolean;
}) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReasonDetailModal, setShowReasonDetailModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const normalizedCancelReason = rental.admin_cancelled_reason
    ? normalizeReasonText(rental.admin_cancelled_reason)
    : "";
  const previewCancelReason = normalizedCancelReason
    ? buildReasonPreview(normalizedCancelReason, REASON_PREVIEW_CHARS)
    : "";

  const handleCancelSubmit = async () => {
    if (!cancelReason.trim()) {
      setCancelError("El motivo es requerido");
      return;
    }
    if (cancelReason.length > ADMIN_CANCELLATION_REASON_MAX_LENGTH) {
      setCancelError(`El motivo no puede exceder ${ADMIN_CANCELLATION_REASON_MAX_LENGTH} caracteres`);
      return;
    }
    try {
      setCancelError("");
      await onCancelRental?.(rental, cancelReason);
      setShowCancelModal(false);
      setCancelReason("");
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : "Error desconocido");
    }
  };

  const getStatusConfig = (rental: ObjectRental) => {
    const overdueInProgress = rental.status === "IN_PROGRESS" && new Date(rental.end_date).getTime() <= Date.now();

    if (rental.status === "CANCELLED") {
      return {
        icon: XCircle,
        color: "text-red-600",
        bg: "bg-red-50",
        badge: "bg-red-100 text-red-700",
      };
    }

    if (overdueInProgress) {
      return {
        icon: AlertCircle,
        color: "text-red-600",
        bg: "bg-red-50",
        badge: "bg-red-100 text-red-700",
      };
    }

    if (rental.status === "IN_PROGRESS") {
      return {
        icon: Calendar,
        color: "text-amber-700",
        bg: "bg-amber-50",
        badge: "bg-amber-100 text-amber-800",
      };
    }

    if (rental.status === "ACTIVE") {
      return {
        icon: Calendar,
        color: "text-blue-600",
        bg: "bg-blue-50",
        badge: "bg-blue-100 text-blue-700",
      };
    }

    if (rental.status === "COMPLETED") {
      if (rental.is_overdue) {
        return {
          icon: AlertCircle,
          color: "text-red-600",
          bg: "bg-red-50",
          badge: "bg-red-100 text-red-700",
        };
      }
      return {
        icon: CheckCircle,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        badge: "bg-emerald-100 text-emerald-700",
      };
    }

    return {
      icon: AlertCircle,
      color: "text-gray-600",
      bg: "bg-gray-50",
      badge: "bg-gray-100 text-gray-700",
    };
  };

  const config = getStatusConfig(rental);
  const Icon = config.icon;
  const userName = `${rental.user.first_name || ""} ${rental.user.last_name || ""}`.trim() || "Usuario";
  const displayLabel = getRentalStatusLabel(rental);

  return (
    <>
      <div className={`rounded-lg border border-gray-200 ${config.bg} p-4 min-w-0 overflow-hidden`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Icon className={`${config.color} mt-1 h-5 w-5 flex-shrink-0`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-semibold text-gray-900 break-all">{userName}</h4>
                <span className={`text-xs font-medium px-2 py-1 rounded ${config.badge} whitespace-nowrap`}>
                  {displayLabel}
                </span>
              </div>
              <div className="mt-2 space-y-1 text-sm text-gray-600 min-w-0">
                <p>
                  <span className="font-medium">Inicio:</span> {formatDate(rental.start_date)}
                </p>
                <p>
                  <span className="font-medium">Fin:</span> {formatDate(rental.end_date)}
                </p>
              </div>

              {rental.status === "IN_PROGRESS" && (
                <div className="mt-2 space-y-1 text-sm">
                  <p className="text-gray-600">
                    Tiempo restante: {rental.remaining_human ?? `${rental.remaining_minutes ?? 0} min`}
                  </p>
                  {rental.elapsed_human && (
                    <p className="text-gray-600">En uso desde hace: {rental.elapsed_human}</p>
                  )}
                </div>
              )}

              {rental.status === "COMPLETED" && (
                <div className="mt-2 space-y-1 text-sm">
                  {rental.is_overdue ? (
                    <p className="font-medium text-red-700">
                      Retraso: {rental.overdue_human ?? `${rental.overdue_minutes ?? 0} min`}
                    </p>
                  ) : null}
                </div>
              )}

              {rental.status === "CANCELLED" && rental.admin_cancelled_by && (
                <div className="mt-2 space-y-1 text-sm text-red-700">
                  <p>
                    <span className="font-medium">Cancelada por:</span>{" "}
                    {rental.admin_cancelled_by.first_name} {rental.admin_cancelled_by.last_name}
                  </p>
                  {normalizedCancelReason && (
                    <div className="min-w-0">
                      <p className="whitespace-pre-wrap break-all">
                        <span className="font-medium">Motivo:</span>{" "}
                        {previewCancelReason}
                      </p>
                      {normalizedCancelReason.length > REASON_PREVIEW_CHARS && (
                        <div className="mt-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 border-red-300 bg-white/80 text-red-700 hover:bg-white"
                            onClick={() => setShowReasonDetailModal(true)}
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            Ver detalle
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {rental.admin_cancelled_at && (
                    <p>
                      <span className="font-medium">Fecha de cancelación:</span> {formatDate(rental.admin_cancelled_at)}
                    </p>
                  )}
                </div>
              )}

              {rental.status === "IN_PROGRESS" && onMarkReturned && (
                <div className="mt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void onMarkReturned(rental)}
                    disabled={isCompleting}
                  >
                    {isCompleting ? "Marcando..." : "Marcar como devuelto"}
                  </Button>
                </div>
              )}

              {status === "ACTIVE" && onCancelRental && (
                <div className="mt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50"
                    onClick={() => setShowCancelModal(true)}
                    disabled={isCancelling}
                  >
                    {isCancelling ? "Cancelando..." : "Cancelar reserva"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showCancelModal && onCancelRental && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Cancelar Reserva</CardTitle>
              <CardDescription>
                Cancelar la reserva de {userName} del {formatDate(rental.start_date)} al{" "}
                {formatDate(rental.end_date)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Motivo de cancelación *
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelReason(e.target.value);
                    setCancelError("");
                  }}
                  placeholder="Describe el motivo de la cancelación..."
                  className="w-full h-24 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-pre-wrap break-words"
                  maxLength={ADMIN_CANCELLATION_REASON_MAX_LENGTH}
                />
                <p className="text-xs text-gray-500">
                  {cancelReason.length}/{ADMIN_CANCELLATION_REASON_MAX_LENGTH} caracteres
                </p>
              </div>

              {cancelError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {cancelError}
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason("");
                    setCancelError("");
                  }}
                  disabled={isCancelling}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={handleCancelSubmit}
                  disabled={isCancelling || !cancelReason.trim()}
                >
                  {isCancelling ? "Cancelando..." : "Confirmar Cancelación"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showReasonDetailModal && normalizedCancelReason && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Detalle del motivo</CardTitle>
              <CardDescription>
                Motivo completo de la cancelación administrativa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap break-all max-h-72 overflow-y-auto leading-relaxed">
                {normalizedCancelReason}
              </p>
              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={() => setShowReasonDetailModal(false)}>
                  Cerrar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

function RentalSection({
  title,
  description,
  rentals,
  status,
  icon: Icon,
  empty,
  onMarkReturned,
  onCancelRental,
  completingRentalIds,
  cancellingRentalIds,
}: {
  title: string;
  description: string;
  rentals: ObjectRental[];
  status: "ACTIVE" | "IN_PROGRESS" | "CANCELLED" | "COMPLETED";
  icon: React.ReactNode;
  empty: string;
  onMarkReturned?: (rental: ObjectRental) => Promise<void>;
  onCancelRental?: (rental: ObjectRental, reason: string) => Promise<void>;
  completingRentalIds?: number[];
  cancellingRentalIds?: number[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {Icon}
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      {rentals.length === 0 ? (
        <p className="text-sm text-gray-500 italic">{empty}</p>
      ) : (
        <div className="space-y-2">
          {rentals.map((rental) => (
            <RentalCard
              key={rental.id}
              rental={rental}
              status={status}
              onMarkReturned={onMarkReturned}
              onCancelRental={onCancelRental}
              isCompleting={Boolean(completingRentalIds?.includes(rental.id))}
              isCancelling={Boolean(cancellingRentalIds?.includes(rental.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function filterRentals(rentals: ObjectRental[], searchUserName: string, searchDate: string): ObjectRental[] {
  return rentals.filter((rental) => {
    const matchesUserName = !searchUserName || `${rental.user.first_name || ""} ${rental.user.last_name || ""}`
      .toLowerCase()
      .includes(searchUserName.toLowerCase());

    const matchesDate =
      !searchDate ||
      rental.start_date.slice(0, 10) === searchDate ||
      rental.end_date.slice(0, 10) === searchDate;

    return matchesUserName && matchesDate;
  });
}

export function RentalHistoryView({
  rentalsByStatus,
  loading,
  onMarkReturned,
  onCancelRental,
  completingRentalIds = [],
  cancellingRentalIds = [],
}: RentalHistoryViewProps) {
  const [searchUserName, setSearchUserName] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const hasActiveFilters = searchUserName.trim().length > 0 || searchDate.length > 0;

  const clearFilters = () => {
    setSearchUserName("");
    setSearchDate("");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-gray-500">Cargando historial de reservas...</CardContent>
      </Card>
    );
  }

  const totalRentals =
    rentalsByStatus.active.length +
    rentalsByStatus.in_progress.length +
    rentalsByStatus.cancelled.length +
    rentalsByStatus.completed.length;

  if (totalRentals === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <Calendar className="h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900">No hay reservas</h3>
          <p className="text-sm text-gray-500 mt-1">Este objeto aún no tiene reservas registradas</p>
        </CardContent>
      </Card>
    );
  }

  const filteredActive = filterRentals(rentalsByStatus.active, searchUserName, searchDate);
  const filteredInProgress = filterRentals(rentalsByStatus.in_progress, searchUserName, searchDate);
  const filteredCancelled = filterRentals(rentalsByStatus.cancelled, searchUserName, searchDate);
  const filteredCompleted = filterRentals(rentalsByStatus.completed, searchUserName, searchDate);

  const filteredTotal =
    filteredActive.length +
    filteredInProgress.length +
    filteredCancelled.length +
    filteredCompleted.length;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Buscar por usuario..."
            value={searchUserName}
            onChange={(e) => setSearchUserName(e.target.value)}
            className="pl-10"
          />
        </div>
        <Input
          type="date"
          value={searchDate}
          onChange={(e) => setSearchDate(e.target.value)}
          placeholder="Buscar por fecha..."
        />
      </div>

      {hasActiveFilters && (
        <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-200 p-3">
          <p className="text-sm text-blue-700">
            <strong>{filteredTotal}</strong> resultado{filteredTotal !== 1 ? "s" : ""} encontrado{filteredTotal !== 1 ? "s" : ""}
          </p>
          <Button size="sm" variant="outline" onClick={clearFilters} className="h-8">
            Limpiar filtros
          </Button>
        </div>
      )}

      <Tabs defaultValue="in_progress" className="space-y-3">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="active">
            Reservadas
            {filteredActive.length > 0 && (
              <span className="ml-1 text-xs font-semibold text-blue-600">({filteredActive.length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            En curso
            {filteredInProgress.length > 0 && (
              <span className="ml-1 text-xs font-semibold text-amber-700">({filteredInProgress.length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Finalizadas
            {filteredCompleted.length > 0 && (
              <span className="ml-1 text-xs font-semibold text-emerald-700">({filteredCompleted.length})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Canceladas
            {filteredCancelled.length > 0 && (
              <span className="ml-1 text-xs font-semibold text-red-700">({filteredCancelled.length})</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <RentalSection
            title="Reservadas"
            description="Reservas próximas que aún no se han iniciado"
            rentals={filteredActive}
            status="ACTIVE"
            icon={<Calendar className="h-5 w-5 text-blue-600" />}
            empty="No hay reservas próximas"
            onMarkReturned={onMarkReturned}
            onCancelRental={onCancelRental}
            completingRentalIds={completingRentalIds}
            cancellingRentalIds={cancellingRentalIds}
          />
        </TabsContent>

        <TabsContent value="in_progress">
          <RentalSection
            title="En Curso"
            description="Reservas actuales en uso"
            rentals={filteredInProgress}
            status="IN_PROGRESS"
            icon={<Calendar className="h-5 w-5 text-amber-700" />}
            empty="No hay reservas en curso"
            onMarkReturned={onMarkReturned}
            onCancelRental={onCancelRental}
            completingRentalIds={completingRentalIds}
            cancellingRentalIds={cancellingRentalIds}
          />
        </TabsContent>

        <TabsContent value="completed">
          <RentalSection
            title="Finalizadas"
            description="Reservas que han finalizado"
            rentals={filteredCompleted}
            status="COMPLETED"
            icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
            empty="No hay reservas finalizadas"
            onMarkReturned={onMarkReturned}
            onCancelRental={onCancelRental}
            completingRentalIds={completingRentalIds}
            cancellingRentalIds={cancellingRentalIds}
          />
        </TabsContent>

        <TabsContent value="cancelled">
          <RentalSection
            title="Canceladas"
            description="Reservas que han sido canceladas"
            rentals={filteredCancelled}
            status="CANCELLED"
            icon={<XCircle className="h-5 w-5 text-red-600" />}
            empty="No hay reservas canceladas"
            onMarkReturned={onMarkReturned}
            onCancelRental={onCancelRental}
            completingRentalIds={completingRentalIds}
            cancellingRentalIds={cancellingRentalIds}
          />
        </TabsContent>
      </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}
