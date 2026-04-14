import { useState } from "react";
import { Calendar, Clock, Eye, MapPin, User } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { UserObjectReservation } from "../../../services/objects.ts";
import { normalizeReasonText, buildReasonPreview, REASON_PREVIEW_CHARS, formatDateTime } from "../../../utils/rentalFormattingUtils";

interface MyReservationsProps {
  reservations: UserObjectReservation[];
  loading: boolean;
  error: string | null;
  cancellingRentalId: number | null;
  dismissingRentalId: number | null;
  onCancel: (objectId: number, rentalId: number) => void;
  onDismiss: (rentalId: number) => void;
  onRetry: () => void;
}

function canCancelReservation(rental: any): boolean {
  return (
    rental.status === "ACTIVE" &&
    new Date(rental.end_date) > new Date()
  );
}

export function MyReservations({ reservations, loading, error, cancellingRentalId, dismissingRentalId, onCancel, onDismiss, onRetry }: MyReservationsProps) {
  return (
    <Card className="border-border/80 shadow-sm min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Mis Reservas</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-gray-500">Cargando tus reservas...</p>
        ) : error ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={onRetry}>
              Reintentar
            </Button>
          </div>
        ) : reservations.length === 0 ? (
          <div className="text-center py-6">
            <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No tienes reservas</h3>
            <p className="text-sm text-gray-500">Cuando reserves objetos, aparecerán aquí.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reservations.map(({ object, rental }) => (
              <ReservationCard
                key={rental.id}
                object={object}
                rental={rental}
                isCancelling={cancellingRentalId === rental.id}
                isDismissing={dismissingRentalId === rental.id}
                onCancel={() => onCancel(object.id, rental.id)}
                onDismiss={() => onDismiss(rental.id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReservationCard({ 
  object, 
  rental,
  isCancelling,
  isDismissing,
  onCancel,
  onDismiss,
}: { 
  object: any; 
  rental: any;
  isCancelling: boolean;
  isDismissing: boolean;
  onCancel: () => void;
  onDismiss: () => void;
}) {
  const [showReasonDetailModal, setShowReasonDetailModal] = useState(false);
  const isCancelled = rental.status === "CANCELLED";
  const isCancelledByAdmin = Boolean(rental.admin_cancelled_by);
  const normalizedCancelReason = rental.admin_cancelled_reason
    ? normalizeReasonText(rental.admin_cancelled_reason)
    : "";
  const previewCancelReason = normalizedCancelReason
    ? buildReasonPreview(normalizedCancelReason, REASON_PREVIEW_CHARS)
    : "";
  const isInProgress = rental.status === "IN_PROGRESS";
  const isActive = rental.status === "ACTIVE";
  const isPast = rental.status === "COMPLETED" || (!isActive && !isInProgress && !isCancelled && new Date(rental.end_date) <= new Date());

  const getStatusColor = () => {
    if (isCancelled) return 'bg-red-100 text-red-700';
    if (isPast) return 'bg-slate-200 text-gray-500';
    if (isInProgress) return 'bg-primary/10 text-primary';
    return 'bg-blue-100 text-blue-800';
  };

  const getStatusText = () => {
    if (isCancelled) return 'Cancelada';
    if (isPast) return 'Finalizada';
    if (isInProgress) return 'En curso';
    if (isActive) return 'Próxima';
    return rental.status || 'Reserva';
  };

  const getCancellationMessage = () => {
    if (isCancelledByAdmin) {
      return "Reserva cancelada por administración";
    }

    return "Reserva cancelada por ti";
  };

  return (
    <article className="rounded-lg border border-border/80 bg-background px-4 py-3 min-w-0 overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900 break-all">{object.name}</p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
          
          {object.location && (
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>{object.location}</span>
            </div>
          )}
          
          <div className="space-y-1 text-sm text-gray-500 min-w-0">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              <span className="break-all">Inicio: {formatDateTime(rental.start_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              <span className="break-all">Fin: {formatDateTime(rental.end_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              <span className="break-all">Reservado por: {rental.user.first_name} {rental.user.last_name}</span>
            </div>
            {isCancelled && (
              <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700 min-w-0 overflow-hidden">
                <p className="text-xs font-semibold">{getCancellationMessage()}</p>
                {isCancelledByAdmin && normalizedCancelReason && (
                  <div className="text-xs mt-1 min-w-0">
                    <p className="whitespace-pre-wrap break-all">
                      Motivo: {previewCancelReason}
                    </p>
                    {normalizedCancelReason.length > REASON_PREVIEW_CHARS && (
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
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
                {isCancelledByAdmin && rental.admin_cancelled_at && (
                  <p className="text-xs mt-1">Fecha: {formatDateTime(rental.admin_cancelled_at)}</p>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-2 sm:flex-row">
          {canCancelReservation(rental) && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={isCancelling}
            >
              {isCancelling ? "Cancelando..." : "Cancelar"}
            </Button>
          )}
          {isCancelled && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDismiss}
              disabled={isDismissing}
            >
              {isDismissing ? "Descartando..." : "Descartar"}
            </Button>
          )}
        </div>
      </div>

      {showReasonDetailModal && normalizedCancelReason && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Detalle del motivo</CardTitle>
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
    </article>
  );
}