import { HeartHandshake, Loader2, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { matchingService, type MyMatchesResponse } from "../../services/matching";

export function MyMatchesPage() {
    const [payload, setPayload] = useState<MyMatchesResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMatches = useCallback(async () => {
        try {
            const data = await matchingService.getMyMatches(10);
            setPayload(data);
            setError(null);
        } catch (err: any) {
            setError(err?.message || "No se pudieron cargar tus matches");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMatches();
    }, [fetchMatches]);

    useEffect(() => {
        if (payload?.status !== "processing") {
            return;
        }

        const intervalId = window.setInterval(() => {
            fetchMatches();
        }, 5000);

        return () => window.clearInterval(intervalId);
    }, [payload?.status, fetchMatches]);

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto p-4">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3 text-slate-700">
                        <Loader2 className="w-5 h-5 animate-spin text-[#4A7C59]" />
                        <p className="text-sm">Cargando tus matches...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto p-4">
                <div className="bg-white rounded-2xl border border-red-200 p-6 shadow-sm">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    if (!payload) {
        return null;
    }

    const isProcessing = payload.status === "processing";

    return (
        <div className="max-w-2xl mx-auto p-4 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#4A7C59]/10 flex items-center justify-center">
                        <HeartHandshake className="w-5 h-5 text-[#4A7C59]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Tus mejores matches</h2>
                    </div>
                </div>
            </div>

            {payload.status === "onboarding_pending" && (
                <StateCard message="Completa tus preferencias para empezar a generar matches." />
            )}

            {payload.status === "insufficient_residents" && (
                <StateCard message="Aún no hay suficientes residentes con onboarding completado para comparar." />
            )}

            {isProcessing && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                    <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-amber-700" />
                        <p className="text-sm text-amber-800">
                            Estamos buscando entre todos los residentes cuáles son los que mejor match tienen contigo.
                        </p>
                    </div>
                </div>
            )}

            {payload.status === "ready" && payload.matches.length === 0 && (
                <StateCard message="Todavía no hay resultados disponibles." />
            )}

            {payload.status === "ready" && payload.matches.length > 0 && (
                <div className="space-y-3">
                    {payload.matches.map((match, index) => {
                        const scorePercent = Math.round(match.score * 100);
                        return (
                            <div key={`${match.membership_id}-${index}`} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {match.display_name}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1 text-[#4A7C59]">
                                        <Sparkles className="w-4 h-4" />
                                        <span className="text-sm font-semibold">{scorePercent}%</span>
                                    </div>
                                </div>
                                <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-2 bg-[#4A7C59]"
                                        style={{ width: `${scorePercent}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function StateCard({ message }: { message: string }) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-slate-600">{message}</p>
        </div>
    );
}
