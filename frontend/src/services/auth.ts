// src/services/auth.ts
import { API_URL } from "./api";

const AUTH_URL = `${API_URL}/auth`;

export interface LoginCredentials {
    email: string;
    password: string;
    portal?: string;
}

export type PortalRole = "student" | "admin";

interface AuthMeUser {
    id?: string | number;
    username?: string;
    email?: string;
    roles?: string[];
    first_name?: string;
    last_name?: string;
}

interface AuthMeResponse {
    authenticated: boolean;
    user: AuthMeUser | null;
}

export function resolvePortalRoleFromRoles(roles: string[] = []): PortalRole | null {
    const normalizedRoles = roles.map(r => r.toLowerCase());

    if (normalizedRoles.includes("student")) {
        return "student";
    }

    if (normalizedRoles.some(role => role !== "student")) {
        return "admin";
    }

    return null;
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

    me: async (): Promise<AuthMeResponse> => {
        const response = await fetch(`${AUTH_URL}/me/`, {
            method: "GET",
            credentials: "include",
        });

        if (!response.ok) {
            throw new Error("No se pudo validar la sesión");
        }

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
    },

    updateProfile: async (data: { first_name: string; last_name: string; username: string; email: string }) => {
        const response = await fetch(`${AUTH_URL}/me/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            credentials: 'include',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (errorData.email) throw new Error(errorData.email[0]);
            if (errorData.username) throw new Error(errorData.username[0]);
            if (errorData.first_name) throw new Error(errorData.first_name[0]);
            if (errorData.last_name) throw new Error(errorData.last_name[0]);

            throw new Error(errorData.detail || 'Error al actualizar el perfil');
        }

        return response.json();
    }
};