// src/services/auth.ts
import { API_URL } from "./api";

const AUTH_URL = `${API_URL}/auth`;

export interface LoginCredentials {
    email: string;
    password: string;
    portal?: string;
}

export const authService = {
    login: async (data: LoginCredentials) => {
        const response = await fetch(`${AUTH_URL}/login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include',
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Error al iniciar sesión');
        }
        return response.json();
    },

    logout: async () => {
        const response = await fetch(`${AUTH_URL}/logout/`, {
            method: 'POST',
            credentials: 'include',
        });
        return response.json();
    },

    requestPasswordReset: async (email: string) => {
        const response = await fetch(`${AUTH_URL}/password-reset/request/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Error al solicitar recuperación');
        }
        return response.json();
    },

    confirmPasswordReset: async (data: { uid: string; token: string; new_password: string }) => {
        const response = await fetch(`${AUTH_URL}/password-reset/confirm/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Enlace inválido o expirado');
        }
        return response.json();
    }
};