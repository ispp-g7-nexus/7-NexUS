import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { getSpace, type AdminSpace } from "../../../services/adminSpaces";

interface Props {
  readonly open: boolean;
  readonly spaceId: number | null;
  readonly onClose: () => void;
  readonly onEdit?: (space: AdminSpace) => void;
  readonly onDeactivate?: (space: AdminSpace) => void;
}

export function SpaceDetailModal({ open, spaceId, onClose, onEdit, onDeactivate }: Props) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="flex items-center justify-between p-4">
          <CardTitle className="text-lg font-semibold">Detalle del espacio</CardTitle>
          <button onClick={onClose} className="text-gray-500">Cerrar</button>
        </CardHeader>
        <CardContent className="p-4">
          {(() => {
            if (loading) {
              return <p className="text-sm text-gray-500">Cargando...</p>;
            }

            if (space == null) {
              return <p className="text-sm text-red-500">No se encontró el espacio.</p>;
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
              <div className="space-y-3">
                <h3 className="text-base font-semibold">{space.name}</h3>
                {space.description && <p className="text-sm text-gray-600">{space.description}</p>}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Aforo</p>
                    <p className="font-semibold">{space.capacity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Intervalo</p>
                    <p className="font-semibold">{space.reservation_interval_minutes}m</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Apertura</p>
                    <p className="font-semibold">{space.open_time.slice(0, 5)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Cierre</p>
                    <p className="font-semibold">{space.close_time.slice(0, 5)}</p>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  {onEdit && (
                    <Button size="sm" onClick={() => onEdit(space)}>
                      Editar
                    </Button>
                  )}
                  {deactivateButton}
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
