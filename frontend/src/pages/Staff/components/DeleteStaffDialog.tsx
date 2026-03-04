// src/pages/Staff/components/DeleteStaffDialog.tsx
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
import type { StaffMember } from "../../../services/staff";

interface DeleteStaffDialogProps {
  member: StaffMember | null;
  onConfirm: (id: number) => Promise<boolean>;
  onClose: () => void;
}

export function DeleteStaffDialog({ member, onConfirm, onClose }: DeleteStaffDialogProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    if (!member) return;
    setDeleting(true);
    const ok = await onConfirm(member.id);
    setDeleting(false);
    if (ok) onClose();
  }

  return (
    <Dialog open={member !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Eliminar personal</DialogTitle>
          <DialogDescription>
            ¿Seguro que quieres eliminar a{" "}
            <span className="font-semibold text-gray-900">{member?.full_name}</span>?
            Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={deleting}>
            <Trash2 className="w-4 h-4" />
            {deleting ? "Eliminando…" : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
