import { fetchWithAuth } from '../utils/api';

// --- INTERFACES DE DATOS (Sincronizadas con Django) ---

export type IncidenceStatus = 'pending' | 'reviewing' | 'in_progress' | 'resolved';
export type PriorityLevel = 'low' | 'high';
export type LocationType = 'habitacion' | 'baño' | 'cocina' | 'comedor' | 'exterior' | 'salas_comunes';

export interface Incidence {
  id: number;
  title: string;
  description: string;
  location_type: LocationType;
  room_number: string | null;
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
}

export interface IncidenceUpdate {
  id: number;
  incidence: number;
  author_name: string;
  text: string;
  created_at: string;
}

// --- DTOs PARA PETICIONES ---

export interface CreateIncidenceDTO {
  title: string;
  description: string;
  location_type: LocationType;
  room_number?: string | null;
  priority?: PriorityLevel; 
}

export interface UpdateIncidenceDTO {
  status?: IncidenceStatus;
  assigned_staff?: number | null;
  assigned_external_name?: string; 
  admin_notes?: string;
  quick_comment?: string; 
}

// --- EL SERVICIO ---

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
    const response = await fetchWithAuth(`/api/incidences/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Error al actualizar');
    }
    return response.json();
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
    return response.json();
  },

  /**
   * Obtener el historial de actualizaciones
   */
  getUpdates: async (incidenceId: number): Promise<IncidenceUpdate[]> => {
    const response = await fetchWithAuth(`/api/incidences/${incidenceId}/updates/`);
    if (!response.ok) throw new Error('Error al cargar el historial');
    return response.json();
  }
};