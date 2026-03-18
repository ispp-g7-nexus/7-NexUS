import { MenuWeek, Meal } from "../types/menu.types";
import { API_URL } from "./api";

/**
 * Servicio para gestionar el menú del comedor.
 * Se comunica con los endpoints /api/menu/...
 */
class MenuService {
  private buildErrorMessage(error: unknown, status: number): string {
    if (error && typeof error === 'object') {
      const data = error as Record<string, unknown>;

      if (typeof data.detail === 'string' && data.detail.trim()) {
        return data.detail;
      }

      for (const value of Object.values(data)) {
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
          return value[0];
        }

        if (typeof value === 'string' && value.trim()) {
          return value;
        }
      }
    }

    return `Error ${status}`;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error desconocido' }));
      throw new Error(this.buildErrorMessage(error, response.status));
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return undefined as T;
    }

    return response.json();
  }

  /**
   * Obtener el menú de la semana actual.
   */
  async getCurrentWeek(): Promise<MenuWeek> {
    return this.request<MenuWeek>('/menu/weeks/current/');
  }

  /**
   * Listar todos los menús semanales disponibles.
   */
  async listWeeks(): Promise<MenuWeek[]> {
    return this.request<MenuWeek[]>('/menu/weeks/');
  }

  /**
   * Obtener detalle de un menú semanal específico.
   */
  async getWeek(weekId: string): Promise<MenuWeek> {
    return this.request<MenuWeek>(`/menu/weeks/${weekId}/`);
  }

  /**
   * Crear un nuevo menú semanal (los días se crean automáticamente).
   */
  async createWeek(weekStart: string, weekEnd: string): Promise<MenuWeek> {
    return this.request<MenuWeek>('/menu/weeks/', {
      method: 'POST',
      body: JSON.stringify({ weekStart, weekEnd }),
    });
  }

  /**
   * Eliminar un menú semanal completo.
   */
  async deleteWeek(weekId: string): Promise<void> {
    return this.request(`/menu/weeks/${weekId}/`, {
      method: 'DELETE',
    });
  }

  /**
   * Actualizar un menú semanal.
   */
  async updateWeek(weekId: string, data: Partial<MenuWeek>): Promise<MenuWeek> {
    return this.request<MenuWeek>(`/menu/weeks/${weekId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * Crear una comida en un día específico.
   */
  async createMeal(dayId: string, meal: Omit<Meal, 'id'>): Promise<Meal> {
    return this.request<Meal>(`/menu/days/${dayId}/meals/`, {
      method: 'POST',
      body: JSON.stringify(meal),
    });
  }

  /**
   * Actualizar una comida existente.
   */
  async updateMeal(mealId: string, meal: Partial<Meal>): Promise<Meal> {
    return this.request<Meal>(`/menu/meals/${mealId}/`, {
      method: 'PATCH',
      body: JSON.stringify(meal),
    });
  }

  /**
   * Eliminar una comida.
   */
  async deleteMeal(mealId: string): Promise<void> {
    return this.request(`/menu/meals/${mealId}/`, {
      method: 'DELETE',
    });
  }
}

export default new MenuService();
