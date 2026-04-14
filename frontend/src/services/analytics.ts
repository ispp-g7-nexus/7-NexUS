import posthog from 'posthog-js';
import { fetchWithAuth, BASE_URL } from "../utils/api";

const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

export const analyticsEnabled = Boolean(POSTHOG_KEY);

if (POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST || 'https://eu.i.posthog.com',
    capture_pageview: false,
    capture_pageleave: true,
  });
}

/** Identify a user for cohort segmentation. */
export function identifyUser(user: {
  id?: string | number;
  email?: string;
  name?: string;
  role: string;
}) {
  if (!analyticsEnabled) return;
  const distinctId = String(user.id ?? user.email ?? 'anonymous');
  posthog.identify(distinctId, {
    email: user.email,
    name: user.name,
    role: user.role,
    tenant: window.location.hostname,
  });
}

/** Reset identity on logout. */
export function resetUser() {
  if (!analyticsEnabled) return;
  posthog.reset();
}

/** Track a pageview (called by PostHogPageviewTracker). */
export function trackPageview() {
  if (!analyticsEnabled) return;
  posthog.capture('$pageview', { $current_url: window.location.href });
}

/** Track a feature/tab access. */
export function trackFeature(feature: string, properties?: Record<string, unknown>) {
  if (!analyticsEnabled) return;
  posthog.capture('feature_accessed', {
    feature,
    ...properties,
  });
}

/** Track any custom event. */
export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (!analyticsEnabled) return;
  posthog.capture(event, properties);
}

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
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.message || `HTTP ${response.status}`);
  }

  return response.json();
};


export const getMenuAnalytics = async (startDate?: string, endDate?: string) => {
  let url = `${BASE_URL}/menu/analytics/`;
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (params.toString()) url += `?${params.toString()}`;

  const response = await fetchWithAuth(url, {
    method: "GET",
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.message || `HTTP ${response.status}`);
  }

  return response.json();
};
