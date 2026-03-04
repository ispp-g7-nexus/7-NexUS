import { fetchWithAuth } from '../utils/api';

const BASE = '/api/bedrooms/';

export async function listBedrooms() {
    return fetchWithAuth(BASE);
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
