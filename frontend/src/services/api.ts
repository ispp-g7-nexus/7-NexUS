// src/services/api.ts
const API_URL = import.meta.env.VITE_API_URL || "/api";
export { API_URL };
export async function checkHealth() {
  const res = await fetch(`/health/`);
  return res.json();
}