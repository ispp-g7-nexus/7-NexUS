export type AnnouncementCategory = 'URGENT' | 'MAINTENANCE' | 'EVENT' | 'GENERAL';

export interface Announcement {
  id: number;
  title: string;
  description: string;
  category: AnnouncementCategory;
  category_display: string;
  announcement_date: string;
  featured: boolean;
  publication_date: string;
  has_passed: boolean;
  user: number | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementList {
  id: number;
  title: string;
  description: string;
  category: AnnouncementCategory;
  category_display: string;
  announcement_date: string;
  featured: boolean;
  has_passed: boolean;
}

export interface CreateAnnouncementDTO {
  title: string;
  description: string;
  category: AnnouncementCategory;
  announcement_date: string;
  featured?: boolean;
}

export interface UpdateAnnouncementDTO extends Partial<CreateAnnouncementDTO> {}

export const CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  'URGENT': 'Urgente',
  'MAINTENANCE': 'Mantenimiento',
  'EVENT': 'Evento',
  'GENERAL': 'General'
};