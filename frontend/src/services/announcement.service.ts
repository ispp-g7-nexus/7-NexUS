import { Announcement, AnnouncementList, CreateAnnouncementDTO, UpdateAnnouncementDTO } from "../types/announcement.types";
import { trackEvent } from "./analytics";
import { API_URL } from "./api";

class AnnouncementService {
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

  private buildListUrl(filters?: Record<string, string>): string {
    const params = filters ? new URLSearchParams(filters).toString() : '';
    const url = params ? `/announcements/?${params}` : '/announcements/';
    return url;
  }

  async getAnnouncements(filters?: Record<string, string>): Promise<AnnouncementList[]> {
    return this.request<AnnouncementList[]>(this.buildListUrl(filters));
  }

  async getAnnouncementsByCategory(category: string): Promise<AnnouncementList[]> {
    if (!category || category === 'all') {
      return this.getAnnouncements();
    }

    return this.getAnnouncements({ category });
  }

  async createAnnouncement(data: CreateAnnouncementDTO): Promise<Announcement> {
    const result = await this.request<Announcement>('/announcements/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    trackEvent('announcement_created', { category: data.category });
    return result;
  }

  async updateAnnouncement(id: number, data: UpdateAnnouncementDTO): Promise<Announcement> {
    const result = await this.request<Announcement>(`/announcements/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    trackEvent('announcement_updated', { announcement_id: id });
    return result;
  }

  async deleteAnnouncement(id: number): Promise<void> {
    await this.request(`/announcements/${id}/`, {
      method: 'DELETE',
    });
    trackEvent('announcement_deleted', { announcement_id: id });
  }

  async getUnviewedCount(): Promise<{ count: number }> {
    return this.request<{ count: number }>('/announcements/unviewed_count/');
  }

  async markAsViewed(announcementIds?: number[]): Promise<{ message: string; viewed_count: number }> {
    const result = await this.request<{ message: string; viewed_count: number }>('/announcements/mark_as_viewed/', {
      method: 'POST',
      body: JSON.stringify({ announcement_ids: announcementIds }),
    });
    trackEvent('announcements_viewed', { count: result.viewed_count });
    return result;
  }
}

export default new AnnouncementService();