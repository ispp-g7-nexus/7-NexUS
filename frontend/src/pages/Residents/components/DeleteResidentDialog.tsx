// src/pages/Residents/components/DeleteResidentDialog.tsx
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import type { Resident } from "../../../services/residents";

interface DeleteResidentDialogProps {
  resident: Resident | null;
  onConfirm: (id: number) => Promise<boolean>;
  onClose: () => void;
}

export function DeleteResidentDialog({
  resident,
  onConfirm,
  onClose,
}: DeleteResidentDialogProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    if (!resident) return;
    setDeleting(true);
    const ok = await onConfirm(resident.id);
    setDeleting(false);
    if (ok) onClose();
  }

  return (
    <Dialog open={resident !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Eliminar residente</DialogTitle>
          <DialogDescription>
            ¿Seguro que quieres desactivar a{" "}
            <span className="font-semibold text-gray-900">
              {resident?.full_name}
            </span>
            ? Esta acción desactivará su acceso a la residencia. Los datos no
            se borran permanentemente.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleting}
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? "Eliminando…" : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
