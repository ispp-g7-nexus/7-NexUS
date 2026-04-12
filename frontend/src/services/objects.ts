// src/services/objects.ts
import { API_URL } from "./api";

const OBJECTS_URL = `${API_URL}/objects`;

async function buildApiError(response: Response, fallbackMessage: string): Promise<Error> {
  try {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const payload = await response.json();
      const detail = typeof payload?.detail === "string" ? payload.detail : "";
      return new Error(detail || `${fallbackMessage} (HTTP ${response.status})`);
    }

    const rawText = (await response.text()).trim();
    if (rawText && !rawText.startsWith("<")) {
      return new Error(rawText);
    }
  } catch {
    // Fall back to a generic message when body parsing fails.
  }

  return new Error(`${fallbackMessage} (HTTP ${response.status})`);
}

export interface ObjectRental {
  id: number;
  start_date: string;
  end_date: string;
  status: 'ACTIVE' | 'IN_PROGRESS' | 'CANCELLED' | 'COMPLETED';
  created_at?: string;
  updated_at?: string;
  planned_duration_minutes?: number;
  elapsed_minutes?: number;
  elapsed_human?: string;
  remaining_minutes?: number;
  remaining_human?: string;
  is_overdue?: boolean;
  overdue_minutes?: number;
  overdue_human?: string;
  is_in_period?: boolean;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email?: string;
  };
  admin_cancelled_by?: {
    id: number;
    first_name: string;
    last_name: string;
  };
  admin_cancelled_reason?: string;
  admin_cancelled_at?: string;
  user_dismissed_at?: string;
}

export interface RentalsByStatus {
  active: ObjectRental[];
  in_progress: ObjectRental[];
  cancelled: ObjectRental[];
  completed: ObjectRental[];
}

export interface ObjectItem {
  id: number;
  name: string;
  description: string;
  location: string;
  availability: boolean;
  stock_total: number;
  current_reserved_stock: number;
  current_available_stock: number;
  image_url?: string;
  tags: string;
  labels: ObjectLabelItem[];
  rentals_count: number;
  can_rent: boolean;
}

export interface ObjectLabelItem {
  id: number;
  name: string;
  created_at: string;
}

export interface CreateObjectRequest {
  name: string;
  description?: string;
  location?: string;
  stock_total?: number;
  label_ids?: number[];
  image_url?: string;
  tags?: string;
}

export interface ReservationRequest {
  start_date: string;
  end_date: string;
}

export interface CancelReservationRequest {
  rental_id?: number;
}

export interface UserObjectReservation {
  rental: ObjectRental;
  object: ObjectItem;
}

export interface CompleteRentalResponse {
  detail: string;
  rental: ObjectRental;
}

export interface ObjectAvailabilitySlot {
  start_time: string;
  end_time: string;
  status: "available" | "occupied" | "past";
  available_stock: number;
}

export interface ObjectAvailabilityReservation {
  id: number;
  start_date: string;
  end_date: string;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface ObjectAvailability {
  date: string;
  reservation_interval_minutes: number;
  reservation_gap_minutes?: number;
  object: ObjectItem;
  reservations: ObjectAvailabilityReservation[];
  available_slots: ObjectAvailabilitySlot[];
}

export interface UserObjectNotification {
  id: string;
  rental_id: number;
  title: string;
  message: string;
  created_at: string;
  source: "objects";
}

export interface AdminObjectRental extends ObjectRental {
  object: {
    id: number;
    name: string;
    location?: string;
    stock_total: number;
  };
}

export const objectsService = {
  // Get all objects
  getObjects: async (): Promise<ObjectItem[]> => {
    const response = await fetch(`${OBJECTS_URL}/`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw await buildApiError(response, 'Error al obtener objetos');
    }
    
    return response.json();
  },

  // Get object details
  getObjectDetail: async (objectId: number): Promise<ObjectItem> => {
    const response = await fetch(`${OBJECTS_URL}/${objectId}/`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw await buildApiError(response, 'Error al obtener detalles del objeto');
    }
    
    return response.json();
  },

  // Labels management
  listLabels: async (): Promise<ObjectLabelItem[]> => {
    const response = await fetch(`${OBJECTS_URL}/labels/`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw await buildApiError(response, 'Error al obtener etiquetas de objetos');
    }

    return response.json();
  },

  createLabel: async (name: string): Promise<ObjectLabelItem> => {
    const response = await fetch(`${OBJECTS_URL}/labels/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });

    if (!response.ok) {
      throw await buildApiError(response, 'Error al crear etiqueta de objeto');
    }

    return response.json();
  },

  deleteLabel: async (labelId: number): Promise<void> => {
    const response = await fetch(`${OBJECTS_URL}/labels/${labelId}/`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw await buildApiError(response, 'Error al eliminar etiqueta de objeto');
    }
  },

  // Get object availability for a date
  getObjectAvailability: async (objectId: number, date: string): Promise<ObjectAvailability> => {
    const response = await fetch(`${OBJECTS_URL}/${objectId}/availability/?date=${encodeURIComponent(date)}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw await buildApiError(response, 'Error al obtener disponibilidad del objeto');
    }

    return response.json();
  },

  // Create new object (admin only)
  createObject: async (objectData: CreateObjectRequest): Promise<{ id: number; detail: string }> => {
    const response = await fetch(`${OBJECTS_URL}/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(objectData)
    });
    
    if (!response.ok) {
      throw await buildApiError(response, 'Error al crear objeto');
    }
    
    return response.json();
  },

  // Delete object (admin only)
  deleteObject: async (objectId: number): Promise<void> => {
    const response = await fetch(`${OBJECTS_URL}/${objectId}/`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw await buildApiError(response, 'Error al eliminar objeto');
    }
  },

  // Reserve object
  reserveObject: async (objectId: number, reservationData: ReservationRequest): Promise<{ id: number; detail: string }> => {
    const response = await fetch(`${OBJECTS_URL}/${objectId}/reserve/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reservationData)
    });
    
    if (!response.ok) {
      throw await buildApiError(response, 'Error al reservar objeto');
    }
    
    return response.json();
  },

  // Cancel reservation
  cancelReservation: async (objectId: number, cancelData?: CancelReservationRequest): Promise<{ detail: string }> => {
    const response = await fetch(`${OBJECTS_URL}/${objectId}/cancel/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cancelData || {})
    });
    
    if (!response.ok) {
      throw await buildApiError(response, 'Error al cancelar reserva');
    }
    
    return response.json();
  },

  // Get object rentals
  getObjectRentals: async (objectId: number): Promise<RentalsByStatus> => {
    const response = await fetch(`${OBJECTS_URL}/${objectId}/rentals/`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw await buildApiError(response, 'Error al obtener reservas del objeto');
    }
    
    return response.json();
  },

  getAllObjectRentals: async (): Promise<AdminObjectRental[]> => {
    const response = await fetch(`${API_URL}/admin/objects/rentals/`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw await buildApiError(response, 'Error al obtener el historial general de reservas');
    }

    return response.json();
  },

  completeObjectRental: async (objectId: number, rentalId: number): Promise<CompleteRentalResponse> => {
    const response = await fetch(`${OBJECTS_URL}/${objectId}/rentals/${rentalId}/complete/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw await buildApiError(response, 'Error al marcar el préstamo como devuelto');
    }

    return response.json();
  },

  // Admin cancel rental
  cancelAdminRental: async (objectId: number, rentalId: number, reason: string): Promise<CompleteRentalResponse> => {
    const response = await fetch(`${OBJECTS_URL}/${objectId}/rentals/${rentalId}/admin-cancel/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });

    if (!response.ok) {
      throw await buildApiError(response, 'Error al cancelar el préstamo');
    }

    return response.json();
  },

  // Get current user's reservations
  getUserObjectReservations: async (): Promise<UserObjectReservation[]> => {
    const response = await fetch(`${API_URL}/my-reservations/`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw await buildApiError(response, 'Error al obtener mis reservas');
    }
    
    return response.json();
  },

  getUserObjectNotifications: async (): Promise<UserObjectNotification[]> => {
    const response = await fetch(`${OBJECTS_URL}/notifications/`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw await buildApiError(response, 'Error al obtener notificaciones de objetos');
    }

    return response.json();
  },

  dismissUserReservation: async (rentalId: number): Promise<{ detail: string }> => {
    const response = await fetch(`${API_URL}/my-reservations/${rentalId}/dismiss/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw await buildApiError(response, 'Error al descartar reserva cancelada');
    }

    return response.json();
  },

  // Get current user's reservations reminders count
  getPendingRemindersCount: async (): Promise<number> => {
    const response = await fetch(`${API_URL}/my-reservations/reminders/unread-count/`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) return 0;
    
    const data = await response.json();
    return data.count || 0;
  },

  // Mark pending reminders as viewed
  markRemindersAsViewed: async (): Promise<{ message: string; marked_count: number }> => {
    const response = await fetch(`${API_URL}/my-reservations/reminders/mark-as-viewed/`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      throw await buildApiError(response, 'Error al marcar avisos como vistos');
    }
    
    return response.json();
  }
};
