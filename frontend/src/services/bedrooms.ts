import { fetchWithAuth } from '../utils/api';

const BASE = '/api/bedrooms/';

export interface Bedroom {
    id: number;
    numero: string;
    edificio: string;
    planta: number | null;
    capacidad_maxima: number;
    tipo: string;
    is_active: boolean;
    ocupantes_actuales: number;
    created_at: string;
    updated_at: string;
}

export interface AvailableBedroom {
    id: number;
    numero: string;
    edificio: string | null;
    tipo: string;
    capacidad_maxima: number;
    ocupantes_actuales: number;
}

export async function listBedrooms(): Promise<Bedroom[]> {
    const res = await fetchWithAuth(BASE);
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return res.json();
}

/**
 * GET /api/bedrooms/available/?exclude_resident_id=<id>
 * Devuelve habitaciones activas con hueco disponible.
 * excludeResidentId: ID de la Membership del residente que se está editando,
 * para que su habitación actual aparezca disponible aunque él la ocupe.
 */
export async function listAvailableBedrooms(excludeResidentId?: number): Promise<AvailableBedroom[]> {
    const params = excludeResidentId ? `?exclude_resident_id=${excludeResidentId}` : '';
    const res = await fetchWithAuth(`${BASE}available/${params}`);
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return res.json();
}

export async function createBedroom(payload: any) {
    return fetchWithAuth(`${BASE}create/`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function updateBedroom(id: number, payload: any) {
    return fetchWithAuth(`${BASE}${id}/update/`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    });
}

export async function deleteBedroom(id: number) {
    return fetchWithAuth(`${BASE}${id}/delete/`, {
        method: 'DELETE',
    });
}

export async function listResidents() {
    return fetchWithAuth(`${BASE}residents/`);
}

