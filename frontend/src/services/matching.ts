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
};
