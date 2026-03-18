// src/pages/Staff/hooks/useStaff.ts
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type StaffMember,
  type StaffPayload,
  staffService,
} from "../../../services/staff";
import { authService } from "../../../services/auth";

export interface UseStaffReturn {
  staff: StaffMember[];
  loading: boolean;
  isUnauthorized: boolean;
  currentUserEmail: string | null;
  refresh: () => Promise<void>;
  createStaff: (payload: StaffPayload) => Promise<boolean>;
  updateStaff: (id: number, payload: Partial<StaffPayload>) => Promise<boolean>;
  deleteStaff: (id: number) => Promise<boolean>;
}

export function useStaff(): UseStaffReturn {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [staffData, userData] = await Promise.all([
        staffService.list(),
        authService.me().catch(() => null)
      ]);

      setStaff(staffData);
      if (userData?.user?.email) {
        setCurrentUserEmail(userData.user.email.toLowerCase());
      }
      setIsUnauthorized(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("401") || msg.includes("403")) {
        setIsUnauthorized(true);
      } else {
        toast.error("No se pudo cargar el personal.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createStaff = useCallback(
    async (payload: StaffPayload): Promise<boolean> => {
      try {
        const created = await staffService.create(payload);
        setStaff((prev) => [...prev, created]);
        toast.success("Personal añadido correctamente.");
        return true;
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error al añadir el personal.");
        return false;
      }
    },
    [],
  );

  const updateStaff = useCallback(
    async (id: number, payload: Partial<StaffPayload>): Promise<boolean> => {
      try {
        const updated = await staffService.update(id, payload);
        setStaff((prev) => prev.map((s) => (s.id === id ? updated : s)));
        toast.success("Personal actualizado correctamente.");
        return true;
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error al actualizar el personal.");
        return false;
      }
    },
    [],
  );

  const deleteStaff = useCallback(async (id: number): Promise<boolean> => {
    try {
      await staffService.delete(id);
      setStaff((prev) => prev.filter((s) => s.id !== id));
      toast.success("Personal eliminado correctamente.");
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar el personal.");
      return false;
    }
  }, []);

  return { staff, loading, isUnauthorized, currentUserEmail, refresh, createStaff, updateStaff, deleteStaff };
}
