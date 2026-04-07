// src/services/roles.ts
import { API_URL } from "./api";

const ROLES_URL = `${API_URL}/membership/roles`;

export interface Role {
    id: number;
    name: string;
    description: string;
    is_system_default: boolean;
    residence: number | null;
    permissions?: string[];
}

export interface RoleFormData {
    name: string;
    description: string;
    permissions?: string[];
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
        if (response.status !== 204) {
            return response.json();
        }
    }
};