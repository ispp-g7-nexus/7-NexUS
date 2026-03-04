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
