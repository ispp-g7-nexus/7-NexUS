// Servicios para la gestión de residentes, habitaciones y asignaciones
import { API_URL } from './api';
import type {
  Residente,
  ResidenteDetalle,
  Habitacion,
  HabitacionDetalle,
  AsignacionHabitacion,
  AsignacionHabitacionDetalle,
  AsignarResidenteDTO,
  DarDeBajaResidenteDTO,
  CambiarHabitacionDTO,
  CrearResidenteDTO,
  CrearHabitacionDTO,
} from '../types/residencias';

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error desconocido' }));
    throw new Error(error.detail || `Error: ${response.status}`);
  }
  return response.json();
};

// ============= RESIDENTES =============

export const residentesService = {
  /**
   * Obtener listado de residentes
   */
  list: async (params?: { is_active?: boolean }): Promise<Residente[]> => {
    const query = new URLSearchParams(
      params?.is_active !== undefined ? { is_active: String(params.is_active) } : {}
    );
    const response = await fetch(`${API_URL}/residentes/?${query}`, {
      credentials: 'include',
    });
    return handleResponse<Residente[]>(response);
  },

  /**
   * Obtener detalle de un residente
   */
  get: async (id: number): Promise<ResidenteDetalle> => {
    const response = await fetch(`${API_URL}/residentes/${id}/`, {
      credentials: 'include',
    });
    return handleResponse<ResidenteDetalle>(response);
  },

  /**
   * Crear un nuevo residente
   */
  create: async (data: CrearResidenteDTO): Promise<ResidenteDetalle> => {
    const response = await fetch(`${API_URL}/residentes/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<ResidenteDetalle>(response);
  },

  /**
   * Actualizar un residente
   */
  update: async (id: number, data: Partial<CrearResidenteDTO>): Promise<ResidenteDetalle> => {
    const response = await fetch(`${API_URL}/residentes/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<ResidenteDetalle>(response);
  },

  /**
   * Eliminar (soft delete) un residente
   */
  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_URL}/residentes/${id}/`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error al eliminar' }));
      throw new Error(error.detail);
    }
  },

  /**
   * Dar de baja a un residente (R6)
   */
  release: async (data: DarDeBajaResidenteDTO): Promise<{ message: string }> => {
    const response = await fetch(`${API_URL}/residentes/release/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<{ message: string }>(response);
  },
};

// ============= HABITACIONES =============

export const habitacionesService = {
  /**
   * Obtener listado de habitaciones
   */
  list: async (params?: { is_active?: boolean; disponible?: boolean }): Promise<Habitacion[]> => {
    const query = new URLSearchParams();
    if (params?.is_active !== undefined) {
      query.append('is_active', String(params.is_active));
    }
    if (params?.disponible !== undefined) {
      query.append('disponible', String(params.disponible));
    }
    const response = await fetch(`${API_URL}/habitaciones/?${query}`, {
      credentials: 'include',
    });
    return handleResponse<Habitacion[]>(response);
  },

  /**
   * Obtener detalle de una habitación
   */
  get: async (id: number): Promise<HabitacionDetalle> => {
    const response = await fetch(`${API_URL}/habitaciones/${id}/`, {
      credentials: 'include',
    });
    return handleResponse<HabitacionDetalle>(response);
  },

  /**
   * Crear una nueva habitación
   */
  create: async (data: CrearHabitacionDTO): Promise<HabitacionDetalle> => {
    const response = await fetch(`${API_URL}/habitaciones/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<HabitacionDetalle>(response);
  },

  /**
   * Actualizar una habitación
   */
  update: async (id: number, data: Partial<CrearHabitacionDTO>): Promise<HabitacionDetalle> => {
    const response = await fetch(`${API_URL}/habitaciones/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<HabitacionDetalle>(response);
  },

  /**
   * Eliminar (soft delete) una habitación
   */
  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_URL}/habitaciones/${id}/`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error al eliminar' }));
      throw new Error(error.detail);
    }
  },

  /**
   * Obtener habitaciones disponibles para un residente específico
   */
  availableForResident: async (residenteId: number): Promise<Habitacion[]> => {
    const response = await fetch(
      `${API_URL}/habitaciones/available-for-resident/${residenteId}/`,
      {
        credentials: 'include',
      }
    );
    return handleResponse<Habitacion[]>(response);
  },
};

// ============= ASIGNACIONES =============

export const asignacionesService = {
  /**
   * Obtener listado de asignaciones
   */
  list: async (params?: {
    estado?: string;
    residente_id?: number;
    habitacion_id?: number;
  }): Promise<AsignacionHabitacion[]> => {
    const query = new URLSearchParams();
    if (params?.estado) query.append('estado', params.estado);
    if (params?.residente_id) query.append('residente_id', String(params.residente_id));
    if (params?.habitacion_id) query.append('habitacion_id', String(params.habitacion_id));

    const response = await fetch(`${API_URL}/asignaciones/?${query}`, {
      credentials: 'include',
    });
    return handleResponse<AsignacionHabitacion[]>(response);
  },

  /**
   * Obtener detalle de una asignación
   */
  get: async (id: number): Promise<AsignacionHabitacionDetalle> => {
    const response = await fetch(`${API_URL}/asignaciones/${id}/`, {
      credentials: 'include',
    });
    return handleResponse<AsignacionHabitacionDetalle>(response);
  },

  /**
   * Crear una nueva asignación (R1, R2, R5)
   */
  create: async (data: AsignarResidenteDTO): Promise<AsignacionHabitacionDetalle> => {
    const response = await fetch(`${API_URL}/asignaciones/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse<AsignacionHabitacionDetalle>(response);
  },

  /**
   * Cambiar un residente de habitación
   */
  changeRoom: async (
    data: CambiarHabitacionDTO
  ): Promise<{
    message: string;
    asignacion_anterior: AsignacionHabitacionDetalle | null;
    nueva_asignacion: AsignacionHabitacionDetalle;
  }> => {
    const response = await fetch(`${API_URL}/asignaciones/change-room/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
};
