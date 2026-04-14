// src/services/preferences.ts
import { trackEvent } from "./analytics";
import { API_URL } from "./api";

const PREFERENCES_URL = `${API_URL}/preferences`;

export interface PreferencesData {
    sex: string;
    age: number;
    schedule: string;
    study_location: string;
    social_level: number;
    weekend_return: string;
    outside_plans_importance: string;
    desired_activity: string;
    order_importance: number;
    noise_tolerance: number;
    smoking_vaping: string;
    visitors_preference: string;
    basic_items_preference: string;
    temperature_preference: string;
}

export interface PreferencesResponse extends PreferencesData {
    id: number;
    is_completed: boolean;
    created_at: string;
    updated_at: string;
}
const getAuthHeaders = () => {
    const token = localStorage.getItem('token'); 
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

export const preferencesService = {
    // Get current user's preferences
    getMyPreferences: async (): Promise<PreferencesResponse> => {
        const response = await fetch(`${PREFERENCES_URL}/my-preferences/`, {
            method: 'GET',
            headers: getAuthHeaders(),
            credentials: 'include',
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Error al obtener preferencias');
        }
        return response.json();
    },

    // Save current user's preferences
    saveMyPreferences: async (data: PreferencesData): Promise<PreferencesResponse> => {
        const response = await fetch(`${PREFERENCES_URL}/my-preferences/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
            credentials: 'include',
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Error al guardar preferencias');
        }
        trackEvent('preferences_saved');
        return response.json();
    },

    // Check if preferences are completed
    checkCompletion: async (): Promise<{ is_completed: boolean }> => {
        const response = await fetch(`${PREFERENCES_URL}/check-completion/`, {
            method: 'GET',
            headers: getAuthHeaders(),
            credentials: 'include',
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Error al verificar preferencias');
        }
        return response.json();
    },
};
