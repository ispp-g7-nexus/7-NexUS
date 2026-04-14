import { fetchWithAuth } from '../utils/api';
import { trackEvent } from './analytics';
export type IncidenceStatus = 'pending' | 'reviewing' | 'in_progress' | 'resolved';
export type PriorityLevel = 'low' | 'high';
export type LocationType = 'habitacion' | 'baño' | 'cocina' | 'comedor' | 'exterior' | 'salas_comunes';

export interface Incidence {
  id: number;
  title: string;
  description: string;
  location_type: LocationType;
  room_number: number | null;
  room_number_detail?: BedroomDetail | null;
  status: IncidenceStatus;
  priority: PriorityLevel;
  student: number;
  student_name?: string;

  assigned_staff: number | null;
  assigned_staff_name?: string;
  assigned_staff_job?: string;
  assigned_external_name?: string;

  admin_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_mine?: boolean;
}

export interface IncidenceUpdate {
  id: number;
  incidence: number;
  author_name: string;
  text: string;
  created_at: string;
}

export interface BedroomDetail {
  id: number;
  numero: string;
  planta?: number;
  edificio?: string;
  tipo?: string;
  capacidad_maxima?: number;
}

// --- DTOs PARA PETICIONES ---

export interface CreateIncidenceDTO {
  title: string;
  description: string;
  location_type: LocationType;
  room_number?: number | null;
  priority?: PriorityLevel;
}

export interface UpdateIncidenceDTO {
  title?: string;
  description?: string;
  location_type?: LocationType;
  img?: string | null;
  priority?: PriorityLevel;
  status?: IncidenceStatus;
  assigned_staff?: number | null;
  assigned_external_name?: string;
  admin_notes?: string;
  quick_comment?: string;
  room_number?: number | null;

}


export const IncidenceService = {

  /**
   * Obtener todas las incidencias (Vista Admin)
   */
  getAll: async (): Promise<Incidence[]> => {
    const response = await fetchWithAuth('/api/incidences/');
    if (!response.ok) throw new Error('Error al cargar incidencias');
    return response.json();
  },

  getById: async (id: number): Promise<Incidence> => {
    const response = await fetchWithAuth(`/api/incidences/${id}/`);
    if (!response.ok) throw new Error('Error al obtener los detalles');
    return response.json();
  },

  /**
   * Actualizar estado, personal asignado o notas
   */
  update: async (id: number, data: UpdateIncidenceDTO): Promise<Incidence> => {
    console.log("-------------------------------");
    console.log("📦 PAYLOAD QUE SALE AL BACKEND:", data);
    console.log("-------------------------------");
    const response = await fetchWithAuth(`/api/incidences/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("DEBUG BACKEND ERROR:", errorData);

      const details = Object.entries(errorData)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value[0] : value}`)
        .join(", ");

      throw new Error(details || 'Error al actualizar');
    }
    const incidence = await response.json();
    trackEvent('incidence_updated', { incidence_id: id, status: data.status });
    return incidence;
  },

  /**
   * Crear nueva incidencia (Vista Alumno)
   */
  create: async (data: CreateIncidenceDTO): Promise<Incidence> => {
    const response = await fetchWithAuth('/api/incidences/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Error al crear la incidencia');
    const incidence = await response.json();
    trackEvent('incidence_created', { priority: data.priority, location: data.location_type });
    return incidence;
  },

  /**
   * Obtener el historial de actualizaciones
   */
  getUpdates: async (incidenceId: number): Promise<IncidenceUpdate[]> => {
    const response = await fetchWithAuth(`/api/incidences/${incidenceId}/updates/`);
    if (!response.ok) throw new Error('Error al cargar el historial');
    return response.json();
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetchWithAuth(`/api/incidences/${id}/`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Error al eliminar la incidencia');
    trackEvent('incidence_deleted', { incidence_id: id });
  },
};

// ── Incidence Analytics ───────────────────────────────────────────────────────

export interface IncidenceAnalyticsSummary {
  total_created_in_period: number;
  total_resolved_in_period: number;
  currently_open: number;
  avg_resolution_hours: number | null;
}

export interface IncidenceOpenByDay {
  date: string;
  open_count: number;
}

export interface IncidenceResolvedByStaff {
  staff_name: string;
  resolved_count: number;
}

export interface IncidenceAnalyticsResponse {
  summary: IncidenceAnalyticsSummary;
  open_by_day: IncidenceOpenByDay[];
  resolved_by_staff: IncidenceResolvedByStaff[];
  meta: { from: string; to: string };
}

export async function getIncidenceAnalytics(params: {
  from: string;
  to: string;
}): Promise<IncidenceAnalyticsResponse> {
  const qs = new URLSearchParams({ from: params.from, to: params.to }).toString();
  const response = await fetchWithAuth(`/api/incidences/analytics/?${qs}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? `Error ${response.status}`);
  }
  return response.json() as Promise<IncidenceAnalyticsResponse>;
}