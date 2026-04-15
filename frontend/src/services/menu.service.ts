import { MenuWeek, Meal } from "../types/menu.types";
import { API_URL } from "./api";

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

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const isFormData = options?.body instanceof FormData;
    const headers: Record<string, string> = { ...options?.headers as Record<string, string> };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error desconocido' }));
      throw new Error(this.buildErrorMessage(error, response.status));
    }

    if (response.status === 204) return undefined as T;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return undefined as T;

    return response.json();
  }

  private post<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) });
  }

  private patch<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data) });
  }

  private serializeBody(data: any): FormData | string {
    return data instanceof FormData ? data : JSON.stringify(data);
  }

  async getCurrentWeek(): Promise<MenuWeek> {
    return this.request<MenuWeek>('/menu/weeks/current/');
  }

  async listWeeks(): Promise<MenuWeek[]> {
    return this.request<MenuWeek[]>('/menu/weeks/');
  }

  async getWeek(weekId: string): Promise<MenuWeek> {
    return this.request<MenuWeek>(`/menu/weeks/${weekId}/`);
  }

  async createWeek(weekStart: string, weekEnd: string): Promise<MenuWeek> {
    return this.post('/menu/weeks/', { weekStart, weekEnd });
  }

  async updateWeek(weekId: string, data: Partial<MenuWeek>): Promise<MenuWeek> {
    return this.patch(`/menu/weeks/${weekId}/`, data);
  }

  async deleteWeek(weekId: string): Promise<void> {
    return this.request(`/menu/weeks/${weekId}/`, { method: 'DELETE' });
  }

  async createMeal(dayId: string, meal: any): Promise<Meal> {
    return this.request<Meal>(`/menu/days/${dayId}/meals/`, {
      method: 'POST',
      body: this.serializeBody(meal),
    });
  }

  async updateMeal(mealId: string, meal: any): Promise<Meal> {
    return this.request<Meal>(`/menu/meals/${mealId}/`, {
      method: 'PATCH',
      body: this.serializeBody(meal),
    });
  }

  async deleteMeal(mealId: string): Promise<void> {
    return this.request(`/menu/meals/${mealId}/`, { method: 'DELETE' });
  }

  async createSpecialRequest(data: { date: string; description: string }): Promise<any> {
    return this.post('/menu/special-requests/', data);
  }

  async getSpecialRequests(): Promise<any[]> {
    return this.request<any[]>('/menu/special-requests/');
  }

  async listSpecialRequests(): Promise<any[]> {
    return this.request<any[]>('/menu/special-requests/list_requests/');
  }

  async updateSpecialRequestStatus(requestId: string | number, status: 'approved' | 'rejected'): Promise<any> {
    return this.patch(`/menu/special-requests/${requestId}/update_status/`, { status });
  }
}

export default new MenuService();