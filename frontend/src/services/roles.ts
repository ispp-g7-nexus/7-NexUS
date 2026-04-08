// src/services/roles.ts
import { trackEvent } from "./analytics";
import { API_URL } from "./api";

const ROLES_URL = `${API_URL}/membership/roles`;

export interface Role {
    id: number;
    name: string;
    description: string;
    is_system_default: boolean;
    residence: number | null;
}

export interface RoleFormData {
    name: string;
    description: string;
}

const getHeaders = (): HeadersInit => {
    return { 'Content-Type': 'application/json' };
};

export const roleService = {
    getRoles: async (): Promise<Role[]> => {
        const response = await fetch(`${ROLES_URL}/`, {
            method: 'GET',
            headers: getHeaders(),
            credentials: 'include',
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Error al obtener los roles');
        }
        return response.json();
    },

    createRole: async (data: RoleFormData): Promise<Role> => {
        const response = await fetch(`${ROLES_URL}/`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data),
            credentials: 'include',
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Error al crear el rol');
        }
        trackEvent('role_created', { role_name: data.name });
        return response.json();
    },

    updateRole: async (id: number, data: Partial<RoleFormData>): Promise<Role> => {
        const response = await fetch(`${ROLES_URL}/${id}/`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(data),
            credentials: 'include',
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Error al actualizar el rol');
        }
        trackEvent('role_updated', { role_id: id });
        return response.json();
    },

    deleteRole: async (id: number): Promise<void> => {
        const response = await fetch(`${ROLES_URL}/${id}/`, {
            method: 'DELETE',
            headers: getHeaders(),
            credentials: 'include',
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Error al eliminar el rol');
        }
        trackEvent('role_deleted', { role_id: id });
        if (response.status !== 204) {
            return response.json();
        }
    }
};