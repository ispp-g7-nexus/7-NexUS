import { fetchWithAuth } from "../utils/api";

export interface StudentProfileDetails {
  id?: number;
  name: string;
  nickname: string;
  bio: string;
  birth_year?: number | null;
  birthplace: string;
  room: string;
  room_number: string;
  profile_image: string | null;
  chronotype: string;
  study_level: number;
  noise_sensitivity: number;
  temperature_preference: string;
  order_level: string;
  interests: string[];
  custom_interests: string[];
  lifestyle: string[];
  music_genres: string[];
  dealbreakers: string[];
  created_at?: string;
  updated_at?: string;
}

export async function getAdminStudentProfile(userId: number): Promise<StudentProfileDetails> {
  const res = await fetchWithAuth(`/api/admin/students/${userId}/profile/`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const detail =
      typeof (body as { detail?: unknown }).detail === "string"
        ? (body as { detail: string }).detail
        : `Error ${res.status}`;
    throw new Error(detail);
  }

  return res.json();
}
