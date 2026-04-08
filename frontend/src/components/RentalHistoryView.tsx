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
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return {
          icon: Calendar,
          color: "text-blue-600",
          bg: "bg-blue-50",
          badge: "bg-blue-100 text-blue-700",
          label: "Reservada",
        };
      case "IN_PROGRESS":
        return {
          icon: Calendar,
          color: "text-amber-700",
          bg: "bg-amber-50",
          badge: "bg-amber-100 text-amber-800",
          label: "En curso",
        };
      case "CANCELLED":
        return {
          icon: XCircle,
          color: "text-red-600",
          bg: "bg-red-50",
          badge: "bg-red-100 text-red-700",
          label: "Cancelada",
        };
      case "COMPLETED":
        return {
          icon: CheckCircle,
          color: "text-emerald-600",
          bg: "bg-emerald-50",
          badge: "bg-emerald-100 text-emerald-700",
          label: "Completada",
        };
      default:
        return {
          icon: AlertCircle,
          color: "text-gray-600",
          bg: "bg-gray-50",
          badge: "bg-gray-100 text-gray-700",
          label: "Desconocido",
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  const userName = `${rental.user.first_name || ""} ${rental.user.last_name || ""}`.trim() || "Usuario";

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
                  {config.label}
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

              {status === "IN_PROGRESS" && (
                <div className="mt-2 space-y-1 text-sm">
                  <p className="text-gray-600">
                    Tiempo restante: {rental.remaining_human ?? `${rental.remaining_minutes ?? 0} min`}
                  </p>
                  {rental.elapsed_human && (
                    <p className="text-gray-600">En uso desde hace: {rental.elapsed_human}</p>
                  )}
                </div>
              )}

              {status === "COMPLETED" && (
                <div className="mt-2 space-y-1 text-sm">
                  {rental.is_overdue ? (
                    <p className="font-medium text-red-700">
                      Retraso: {rental.overdue_human ?? `${rental.overdue_minutes ?? 0} min`}
                    </p>
                  ) : null}
                </div>
              )}

              {status === "CANCELLED" && rental.admin_cancelled_by && (
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

              {status === "COMPLETED" && rental.status === "IN_PROGRESS" && onMarkReturned && (
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

function filterRentals(
  rentals: ObjectRental[],
  searchUserName: string,
  searchDate: string
): ObjectRental[] {
  const normalizedNameQuery = searchUserName.trim().toLowerCase();

  return rentals.filter((rental) => {
    const userName = `${rental.user.first_name || ""} ${rental.user.last_name || ""}`.toLowerCase();
    const matchesUserName = userName.includes(normalizedNameQuery);

    let matchesDate = true;
    if (searchDate) {
      const dayStart = new Date(`${searchDate}T00:00:00`);
      const dayEnd = new Date(`${searchDate}T23:59:59.999`);
      const rentalStartDate = new Date(rental.start_date);
      const rentalEndDate = new Date(rental.end_date);

      // Match when the reservation interval overlaps the selected calendar day.
      matchesDate = rentalStartDate <= dayEnd && rentalEndDate >= dayStart;
    }

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

  // Filter rentals based on search criteria
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Historial de Reservas</CardTitle>
          <CardDescription>
            Total de {filteredTotal} de {totalRentals} reserva{totalRentals !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-medium text-gray-900">Buscar reservas</h4>
              {hasActiveFilters && (
                <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre..."
                  value={searchUserName}
                  onChange={(e) => setSearchUserName(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <p className="text-sm text-gray-600">
                Mostrando {filteredTotal} de {totalRentals} resultado{totalRentals !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          <Tabs defaultValue="in-progress" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="in-progress">
                En curso ({filteredInProgress.length})
              </TabsTrigger>
              <TabsTrigger value="active">
                Reservadas ({filteredActive.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Finalizadas ({filteredCompleted.length})
              </TabsTrigger>
              <TabsTrigger value="cancelled">
                Canceladas ({filteredCancelled.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="in-progress" className="pt-4">
              <RentalSection
                title="Préstamos en curso"
                description={`${filteredInProgress.length} de ${rentalsByStatus.in_progress.length} actualmente en uso`}
                rentals={filteredInProgress}
                status="IN_PROGRESS"
                icon={<Calendar className="h-5 w-5 text-amber-700" />}
                empty="No hay préstamos en curso que coincidan con la búsqueda"
                onMarkReturned={onMarkReturned}
                completingRentalIds={completingRentalIds}
              />
            </TabsContent>

            <TabsContent value="active" className="pt-4">
              <RentalSection
                title="Reservas programadas"
                description={`${filteredActive.length} de ${rentalsByStatus.active.length} pendientes de inicio`}
                rentals={filteredActive}
                status="ACTIVE"
                icon={<Calendar className="h-5 w-5 text-blue-600" />}
                empty="No hay reservas programadas que coincidan con la búsqueda"
                onCancelRental={onCancelRental}
                cancellingRentalIds={cancellingRentalIds}
              />
            </TabsContent>

            <TabsContent value="completed" className="pt-4">
              <RentalSection
                title="Reservas Completadas"
                description={`${filteredCompleted.length} de ${rentalsByStatus.completed.length} finalizadas`}
                rentals={filteredCompleted}
                status="COMPLETED"
                icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
                empty="No hay reservas completadas que coincidan con la búsqueda"
                onMarkReturned={onMarkReturned}
                completingRentalIds={completingRentalIds}
              />
            </TabsContent>

            <TabsContent value="cancelled" className="pt-4">
              <RentalSection
                title="Reservas Canceladas"
                description={`${filteredCancelled.length} de ${rentalsByStatus.cancelled.length} canceladas`}
                rentals={filteredCancelled}
                status="CANCELLED"
                icon={<XCircle className="h-5 w-5 text-red-600" />}
                empty="No hay reservas canceladas que coincidan con la búsqueda"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
