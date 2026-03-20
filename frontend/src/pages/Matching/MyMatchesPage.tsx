import React, { useCallback, useEffect, useState } from "react";
import { HeartHandshake, Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { matchingService, type MyMatchesResponse, type MatchItem } from "../../services/matching";
import { getInitials, getTags, formatWeekendReturn, formatStudyLocation, formatOutsidePlans, formatVisitorsPreference, formatBasicItems, formatTemperature } from "./utils";
import { MatchCard } from "./components/MatchCard";

export function MyMatchesPage() {
    const [payload, setPayload] = useState<MyMatchesResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [savedMatches, setSavedMatches] = useState<Record<number, boolean>>({});
    const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null);

    const fetchMatches = useCallback(async () => {
        try {
            const data = await matchingService.getMyMatches(10);
            setPayload(data);
            setError(null);
        } catch (err) {
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
        const intervalId = globalThis.setInterval(fetchMatches, 5000);
        return () => globalThis.clearInterval(intervalId);
    }, [payload?.status, fetchMatches]);

    const toggleSaveMatch = (membershipId: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSavedMatches((prev) => ({
            ...prev,
            [membershipId]: !prev[membershipId],
        }));
    };

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto p-4">
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center gap-3 text-gray-500">
                        <Loader2 className="w-5 h-5 animate-spin text-green-700" />
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

    return (
        <div className="max-w-2xl mx-auto p-4 space-y-4">
            <PageHeader />
            <ContentRenderer 
                payload={payload} 
                savedMatches={savedMatches} 
                onToggleSave={toggleSaveMatch} 
                onSelectMatch={setSelectedMatch} 
            />
            <MatchProfileModal 
                match={selectedMatch} 
                onClose={() => setSelectedMatch(null)} 
            />
        </div>
    );
}

function PageHeader() {
    return (
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-md">
                    <HeartHandshake className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-xl font-bold text-gray-900">Tus Matches</h2>
                </div>
            </div>
        </div>
    );
}

function ContentRenderer({
    payload,
    savedMatches,
    onToggleSave,
    onSelectMatch,
}: {
    payload: MyMatchesResponse;
    savedMatches: Record<number, boolean>;
    onToggleSave: (id: number, e?: React.MouseEvent) => void;
    onSelectMatch: (match: MatchItem) => void;
}) {
    if (payload.status === "onboarding_pending") {
        return <StateCard message="Completa tus preferencias para empezar a generar matches." />;
    }

    if (payload.status === "insufficient_residents") {
        return <StateCard message="Aún no hay suficientes residentes con onboarding completado para comparar." />;
    }

    if (payload.status === "processing") {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-amber-700" />
                    <p className="text-sm text-amber-800">
                        Estamos buscando entre todos los residentes cuáles son los que mejor match tienen contigo.
                    </p>
                </div>
            </div>
        );
    }

    if (payload.status === "ready" && payload.matches.length === 0) {
        return <StateCard message="Todavía no hay resultados disponibles." />;
    }

    return (
        <div className="space-y-4">
            {payload.matches.map((match, index) => (
                <MatchCard
                    key={`${match.membership_id}-${index}`}
                    match={match}
                    index={index}
                    isSaved={!!savedMatches[match.membership_id]}
                    onToggleSave={onToggleSave}
                    onClick={() => onSelectMatch(match)}
                />
            ))}
        </div>
    );
}

function MatchProfileModal({
    match,
    onClose,
}: {
    match: MatchItem | null;
    onClose: () => void;
}) {
    return (
        <Dialog open={!!match} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto w-[95vw] rounded-2xl">
                <DialogHeader className="mb-6 flex flex-col items-center justify-center space-y-4 pt-4">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold shadow-md">
                        {match ? getInitials(match.display_name) : ""}
                    </div>
                    <div className="text-center space-y-1.5">
                        <DialogTitle className="text-2xl font-bold text-gray-900 leading-tight">
                            {match?.display_name}
                        </DialogTitle>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary text-secondary-foreground rounded-full border border-border">
                            <Sparkles className="w-4 h-4 text-secondary-foreground" />
                            <span className="text-sm font-bold">
                                {match ? Math.round(match.score * 100) : 0}% Match
                            </span>
                        </div>
                    </div>
                </DialogHeader>

                {match && <MatchProfileDetails match={match} />}
            </DialogContent>
        </Dialog>
    );
}

function MatchProfileDetails({ match }: { match: MatchItem }) {
    const tags = getTags(match);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Atributos Clave</h4>
                <div className="flex flex-wrap gap-2">
                    {tags.map((tag, i) => (
                        <span key={i} className={`px-3 py-1.5 rounded-md text-sm font-medium ${tag.color}`}>
                            {tag.label}
                        </span>
                    ))}
                    {tags.length === 0 && (
                        <span className="text-sm text-slate-400 italic">No hay etiquetas destacadas</span>
                    )}
                </div>
            </div>

            <div className="h-px bg-gray-50 w-full" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <DetailItem label="Edad" value={match.age ? `${match.age} años` : null} />
                <DetailItem label="Convivencia Fines de Semana" value={formatWeekendReturn(match.weekend_return)} />
                <DetailItem label="Ubicación de estudio preferida" value={formatStudyLocation(match.study_location)} />
                <DetailItem label="Importancia Planes Fuera" value={formatOutsidePlans(match.outside_plans_importance)} />
                <DetailItem label="Importancia del Orden" value={match.order_importance ? `${match.order_importance}/10` : null} />
                <DetailItem label="Tolerancia al Ruido" value={match.noise_tolerance ? `${match.noise_tolerance}/10` : null} />
                <DetailItem label="Preferencia de Visitas" value={formatVisitorsPreference(match.visitors_preference)} />
                <DetailItem label="Preferencia de Objetos Básicos" value={formatBasicItems(match.basic_items_preference)} />
                <DetailItem label="Preferencia de Temperatura" value={formatTemperature(match.temperature_preference)} />
            </div>
        </div>
    );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
    if (!value) return null;
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
            <span className="text-sm font-medium text-gray-900">{value}</span>
        </div>
    );
}

function StateCard({ message }: { message: string }) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <p className="text-sm text-gray-500">{message}</p>
        </div>
    );
}
