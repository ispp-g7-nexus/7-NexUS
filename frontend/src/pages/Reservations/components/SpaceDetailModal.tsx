import { useEffect, useState } from "react";
import { X } from "lucide-react"; // Importamos X para un botón de cierre más visual
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { getSpace, type AdminSpace } from "../../../services/adminSpaces";

interface Props {
  readonly open: boolean;
  readonly spaceId: number | null;
  readonly onClose: () => void;
  readonly onEdit?: (space: AdminSpace) => void;
  readonly onDeactivate?: (space: AdminSpace) => void;
  readonly onDelete?: (space: AdminSpace) => void;
  readonly onViewReservations?: (space: AdminSpace) => void;
}

export function SpaceDetailModal({ open, spaceId, onClose, onEdit, onDeactivate, onDelete, onViewReservations }: Props) {
  const [space, setSpace] = useState<AdminSpace | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (open && spaceId) {
      setLoading(true);
      void getSpace(spaceId)
        .then((s) => {
          if (mounted) setSpace(s);
        })
        .catch(() => {
          if (mounted) setSpace(null);
        })
        .finally(() => mounted && setLoading(false));
    }
    return () => {
      mounted = false;
    };
  }, [open, spaceId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg shadow-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
          <CardTitle className="text-lg font-semibold">Detalle del espacio</CardTitle>
          <button 
            onClick={onClose} 
            className="p-1 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </CardHeader>
        
        <CardContent className="p-0 overflow-y-auto max-h-[80vh]">
          {(() => {
            if (loading) {
              return <div className="p-8 text-center text-sm text-gray-500">Cargando...</div>;
            }

            if (space == null) {
              return <div className="p-8 text-center text-sm text-red-500">No se encontró el espacio.</div>;
            }

            const deactivateButton = onDeactivate
              ? space.is_active
                ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/40"
                      onClick={() => onDeactivate(space)}
                    >
                      Desactivar
                    </Button>
                  )
                : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="text-destructive/60 border-destructive/10"
                    >
                      Ya inactivo
                    </Button>
                  )
              : null;

            return (
              <div className="flex flex-col">
                {/* SECCIÓN DE LA IMAGEN */}
                {space.img ? (
                  <div className="w-full h-56 bg-gray-100">
                    <img 
                      src={space.img} 
                      alt={space.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-32 bg-gray-50 flex items-center justify-center border-b">
                    <p className="text-xs text-gray-400 italic">Sin imagen asignada</p>
                  </div>
                )}

                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-gray-900 break-words">{space.name}</h3>
                    {space.description && (
                      <p className="text-sm text-gray-600 leading-relaxed break-words whitespace-pre-wrap">
                        {space.description}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Aforo</p>
                      <p className="font-semibold text-gray-700">{space.capacity} personas</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Intervalo</p>
                      <p className="font-semibold text-gray-700">{space.reservation_interval_minutes} min</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Horario apertura</p>
                      <p className="font-semibold text-gray-700">{space.open_time.slice(0, 5)} h</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Horario cierre</p>
                      <p className="font-semibold text-gray-700">{space.close_time.slice(0, 5)} h</p>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-2 flex-wrap">
                    {onViewReservations && (
                      <Button variant="outline" size="sm" onClick={() => onViewReservations(space)}>
                        Ver reservas
                      </Button>
                    )}
                    {onEdit && (
                      <Button variant="nexus" size="sm" onClick={() => onEdit(space)}>
                        Editar información
                      </Button>
                    )}
                    {deactivateButton}
                    {onDelete && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(space)}
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}

export default SpaceDetailModal;
