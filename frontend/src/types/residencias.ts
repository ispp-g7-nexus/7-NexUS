// Tipos para la gestión de residentes, habitaciones y asignaciones

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
}

export enum Genero {
  M = 'M',
  F = 'F',
  O = 'O',
}

export const GeneroDisplay: Record<Genero, string> = {
  [Genero.M]: 'Masculino',
  [Genero.F]: 'Femenino',
  [Genero.O]: 'Otro',
};

export enum TipoHabitacion {
  INDIVIDUAL = 'IND',
  COMPARTIDA = 'COMP',
}

export const TipoHabitacionDisplay: Record<TipoHabitacion, string> = {
  [TipoHabitacion.INDIVIDUAL]: 'Individual',
  [TipoHabitacion.COMPARTIDA]: 'Compartida',
};

export enum EstadoAsignacion {
  ACTIVA = 'ACTIVA',
  FINALIZADA = 'FINALIZADA',
  CANCELADA = 'CANCELADA',
}

export const EstadoAsignacionDisplay: Record<EstadoAsignacion, string> = {
  [EstadoAsignacion.ACTIVA]: 'Activa',
  [EstadoAsignacion.FINALIZADA]: 'Finalizada',
  [EstadoAsignacion.CANCELADA]: 'Cancelada',
};

export interface AsignacionActual {
  id: number;
  habitacion_id: number;
  habitacion_numero: string;
  fecha_inicio: string;
}

export interface Residente {
  id: number;
  user: User;
  genero: Genero;
  genero_display: string;
  fecha_nacimiento?: string;
  telefono?: string;
  fecha_ingreso: string;
  fecha_baja?: string;
  is_active: boolean;
  asignacion_actual?: AsignacionActual | null;
  created_at: string;
  updated_at: string;
}

export interface ResidenteDetalle extends Residente {
  residence: number;
  residence_name: string;
}

export interface Habitacion {
  id: number;
  numero: string;
  piso: number;
  tipo: TipoHabitacion;
  tipo_display: string;
  capacidad_maxima: number;
  genero_asignado?: Genero | null;
  genero_asignado_display?: string;
  asignaciones_activas_count: number;
  esta_llena: boolean;
  esta_vacia: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HabitacionDetalle extends Habitacion {
  residence: number;
  residence_name: string;
}

export interface AsignacionHabitacion {
  id: number;
  residente: number;
  residente_nombre: string;
  residente_email: string;
  habitacion: number;
  habitacion_numero: string;
  estado: EstadoAsignacion;
  estado_display: string;
  fecha_inicio: string;
  fecha_fin?: string;
  created_at: string;
  updated_at: string;
}

export interface AsignacionHabitacionDetalle {
  id: number;
  residente: Residente;
  habitacion: Habitacion;
  estado: EstadoAsignacion;
  estado_display: string;
  fecha_inicio: string;
  fecha_fin?: string;
  created_at: string;
  updated_at: string;
}

// DTOs para operaciones
export interface AsignarResidenteDTO {
  residente_id: number;
  habitacion_id: number;
  fecha_inicio?: string;
}

export interface DarDeBajaResidenteDTO {
  residente_id: number;
  fecha_baja?: string;
}

export interface CambiarHabitacionDTO {
  residente_id: number;
  nueva_habitacion_id: number;
  fecha_cambio?: string;
}

export interface CrearResidenteDTO {
  user_id: number;
  residence: number;
  genero: Genero;
  fecha_nacimiento?: string;
  telefono?: string;
  fecha_ingreso: string;
}

export interface CrearHabitacionDTO {
  residence: number;
  numero: string;
  piso: number;
  tipo: TipoHabitacion;
  capacidad_maxima: number;
}
