import { API_URL } from "./api";

const AUTH_URL = `${API_URL}/auth`;

export interface LoginCredentials {
    email: string;
    password: string;
    portal?: string;
    rememberMe?: boolean;
}

export type PortalRole = "student" | "admin";

export interface AuthMeUser {
    id?: string | number;
    username?: string;
    email?: string;
    roles?: string[];
    permissions?: string[];
    is_staff?: boolean;
    first_name?: string;
    last_name?: string;
}

interface AuthMeResponse {
    authenticated: boolean;
    user: AuthMeUser | null;
}

export function hasScreenPermission(user: AuthMeUser | null | undefined, screenName: string): boolean {
    if (!user) return false;

    if (user.is_staff) return true;

    const roles = (user.roles || []).map(r => r.toLowerCase());
    const permissions = user.permissions || [];

    if (
        roles.includes("admin") ||
        roles.includes("administrador") ||
        roles.includes("residence_admin") ||
        roles.includes("portfolio_admin") ||
        permissions.includes("full_access")
    ) {
        return true;
    }

    if (roles.includes("student") || roles.includes("residente")) {
        return false;
    }

    return permissions.includes(screenName);
}

export function resolvePortalRoleFromRoles(roles: string[] = []): PortalRole | null {
    const normalizedRoles = roles.map(r => r.toLowerCase());

    if (normalizedRoles.includes("student") || normalizedRoles.includes("residente")) {
        return "student";
    }

    if (normalizedRoles.some(role => role !== "student" && role !== "residente")) {
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
            cache: "no-store",
        });

        const currentPath = globalThis.location.pathname;
        const isPublicRoute = currentPath === "/" || currentPath.includes("login") || currentPath === "/forgot-password";

        if (!response.ok) {
            console.error("El servidor rechazó el token (caducado o inválido).");
            if (!isPublicRoute) {
                globalThis.location.href = "/";
            }
            throw new Error("No se pudo validar la sesión");
        }

        const data = await response.json();

        if (!data.authenticated) {
            console.error("El servidor dice que no hay sesión activa.");
            if (!isPublicRoute) {
                globalThis.location.href = "/";
            }
            throw new Error("Sesión caducada");
        }

        return data;
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