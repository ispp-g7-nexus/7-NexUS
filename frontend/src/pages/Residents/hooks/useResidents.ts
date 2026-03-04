// src/pages/Residents/hooks/useResidents.ts
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type CreateResidentPayload,
  type Resident,
  type UpdateResidentPayload,
  residentsService,
} from "../../../services/residents";

export interface UseResidentsReturn {
  residents: Resident[];
  loading: boolean;
  isUnauthorized: boolean;
  refresh: () => Promise<void>;
  createResident: (payload: CreateResidentPayload) => Promise<boolean>;
  updateResident: (id: number, payload: UpdateResidentPayload) => Promise<boolean>;
  deleteResident: (id: number) => Promise<boolean>;
}

export function useResidents(): UseResidentsReturn {
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await residentsService.list();
      setResidents(data);
      setIsUnauthorized(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("401") || msg.includes("403")) {
        setIsUnauthorized(true);
      } else {
        toast.error("No se pudieron cargar los residentes.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createResident = useCallback(
    async (payload: CreateResidentPayload): Promise<boolean> => {
      try {
        await residentsService.create(payload);
        toast.success("Residente creado correctamente.");
        await refresh();
        return true;
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error al crear el residente.");
        return false;
      }
    },
    [refresh],
  );

  const updateResident = useCallback(
    async (id: number, payload: UpdateResidentPayload): Promise<boolean> => {
      try {
        const updated = await residentsService.update(id, payload);
        setResidents((prev) => prev.map((r) => (r.id === id ? updated : r)));
        toast.success("Residente actualizado correctamente.");
        return true;
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Error al actualizar el residente.");
        return false;
      }
    },
    [],
  );

  const deleteResident = useCallback(async (id: number): Promise<boolean> => {
    try {
      await residentsService.delete(id);
      setResidents((prev) => prev.filter((r) => r.id !== id));
      toast.success("Residente eliminado correctamente.");
      return true;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar el residente.");
      return false;
    }
  }, []);

  return {
    residents,
    loading,
    isUnauthorized,
    refresh,
    createResident,
    updateResident,
    deleteResident,
  };
}
