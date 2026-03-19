import { fetchWithAuth } from '../utils/api';

const BASE = '/api/bedrooms/';

export interface BedroomResident {
    id: number;
    full_name: string;
}

export interface Bedroom {
    id: number;
    numero: string;
    edificio: string;
    planta: number | null;
    capacidad_maxima: number;
    tipo: string;
    is_active: boolean;
    ocupantes_actuales: number;
    residentes: BedroomResident[];
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
    const data = await res.json() as Array<Bedroom & { residentes?: BedroomResident[] }>;
    return data.map((room) => ({
        ...room,
        residentes: Array.isArray(room.residentes) ? room.residentes : [],
    }));
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

export async function createBedroom(payload: Record<string, unknown>) {
    return fetchWithAuth(`${BASE}create/`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function updateBedroom(id: number, payload: Record<string, unknown>) {
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

export interface BedroomResident {
    id: number;
    user_id: number;
    full_name: string;
    email: string | null;
    residence_id: number | null;
}

export async function getBedroomResidents(id: number): Promise<BedroomResident[]> {
    const res = await fetchWithAuth(`${BASE}${id}/residents/`);
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return res.json();
}

export async function listResidents() {
    return fetchWithAuth(`${BASE}residents/`);
}
