// src/services/api.ts
import { trackEvent } from "./analytics";

const API_URL = import.meta.env.VITE_API_URL || "/api";
export { API_URL };

export async function checkHealth() {
  const res = await fetch(`/health/`);
  return res.json();
}

export async function getStudentProfile() {
  try {
    const res = await fetch(`${API_URL}/student/profile/`, {
      method: "GET",
      credentials: "include", 
      headers: {
        "Accept": "application/json",
      },
    });
    if (res.status === 401) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error("Error fetching student profile:", error);
    return null;
  }
}

export async function saveStudentProfile(profileData: Record<string, any>) {
  try {
    const res = await fetch(`${API_URL}/student/profile/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(profileData),
    });

    if (res.status === 401) throw new Error("Sesión no válida");
    if (!res.ok) throw new Error(`Error ${res.status}`);

    trackEvent('student_profile_saved');
    return await res.json();
  } catch (error) {
    console.error("Error saving student profile:", error);
    throw error;
  }
}