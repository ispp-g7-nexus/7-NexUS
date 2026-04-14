import { API_URL } from "./api";

const MATCHING_URL = `${API_URL}/matching`;

export type MatchStatus =
    | "onboarding_pending"
    | "insufficient_residents"
    | "processing"
    | "ready";

export interface MatchItem {
    membership_id: number;
    display_name: string;
    score: number;
    updated_at: string;
    liked_by_me: boolean;
    is_mutual: boolean;
    horario_ritmo?: string | null;
    nivel_sociabilidad?: number | null;
    habito_fumar_vapear?: string | null;
    sex?: string | null;
    age?: number | null;
    study_location?: string | null;
    weekend_return?: string | null;
    outside_plans_importance?: string | null;
    desired_activity?: string | null;
    order_importance?: number | null;
    noise_tolerance?: number | null;
    visitors_preference?: string | null;
    basic_items_preference?: string | null;
    temperature_preference?: string | null;
}

export interface MyMatchesResponse {
    status: MatchStatus;
    message: string;
    matches: MatchItem[];
}

export const matchingService = {
    getMyMatches: async (limit = 10): Promise<MyMatchesResponse> => {
        const response = await fetch(`${MATCHING_URL}/me/?limit=${limit}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || "Error al obtener tus matches");
        }

        return response.json();
    },

    likeMatch: async (
        membershipId: number
    ): Promise<{ is_mutual: boolean }> => {
        const response = await fetch(`${MATCHING_URL}/likes/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ membership_id: membershipId }),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || "Error al dar like");
        }
        return response.json();
    },

    unlikeMatch: async (membershipId: number): Promise<void> => {
        const response = await fetch(
            `${MATCHING_URL}/likes/${membershipId}/`,
            {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
            }
        );
        if (!response.ok && response.status !== 204) {
            throw new Error("Error al quitar like");
        }
    },

    startMatchChat: async (
        membershipId: number
    ): Promise<{ conversation_id: number }> => {
        const response = await fetch(`${MATCHING_URL}/chats/start/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ membership_id: membershipId }),
        });
        if (!response.ok) {
            if (response.status === 403) {
                throw new Error("Se requiere like mutuo para abrir el chat.");
            }
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || "No se pudo abrir el chat.");
        }
        return response.json();
    },
};
