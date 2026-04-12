import { fetchWithAuth, BASE_URL } from "../utils/api";

export const getMembershipAnalytics = async (startDate?: string, endDate?: string) => {
  let url = `${BASE_URL}/membership/analytics/summary/`;
  const params = new URLSearchParams();
  if (startDate) {
    params.append('start_date', startDate);
  }
  if (endDate) {
    params.append('end_date', endDate);
  }
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  const response = await fetchWithAuth(url, {
    method: 'GET',
  });

  if (!response.ok) {
    // Try to extract error details if provided
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.message || `HTTP ${response.status}`);
  }

  return response.json();
};
