import { HeartHandshake, Loader2, Sparkles, Heart } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import React, { useCallback, useEffect, useState } from "react";
import { matchingService, type MyMatchesResponse, type MatchItem } from "../../services/matching";

const getInitials = (name: string) => {
    return name
        .split(' ')
        .map(n => n.replace(/[^a-zA-Z]/g, '')[0])
        .filter(Boolean)
        .join('')
        .slice(0, 2)
        .toUpperCase();
};

const getTags = (match: MatchItem) => {
    const tags = [];
    if (match.horario_ritmo === "madrugador") {
        tags.push({ label: "Madrugador", color: "bg-blue-100 text-blue-800" });
    } else if (match.horario_ritmo === "nocturno") {
        tags.push({ label: "Nocturno", color: "bg-indigo-100 text-indigo-800" });
    }
    
    if (match.nivel_sociabilidad && match.nivel_sociabilidad >= 6) {
        tags.push({ label: "Sociable", color: "bg-purple-100 text-purple-800" });
    } else if (match.nivel_sociabilidad && match.nivel_sociabilidad <= 4) {
        tags.push({ label: "Tranquilo", color: "bg-teal-100 text-teal-800" });
    }
    
    if (match.habito_fumar_vapear === "no_me_molesta" || match.habito_fumar_vapear === "no_da_igual") {
        tags.push({ label: "No fumador", color: "bg-emerald-100 text-emerald-800" });
    } else if (match.habito_fumar_vapear === "fumo") {
        tags.push({ label: "Permite Fumar", color: "bg-rose-100 text-rose-800" });
    }
    
    return tags;
};

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

    const [savedMatches, setSavedMatches] = useState<Record<number, boolean>>({});

    const toggleSaveMatch = (membershipId: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSavedMatches(prev => ({
            ...prev,
            [membershipId]: !prev[membershipId]
        }));
    };

    const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null);

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
                <div className="space-y-4">
                    {payload.matches.map((match, index) => {
                        const scorePercent = Math.round(match.score * 100);
                        const isTop3 = index < 3;
                        const tags = getTags(match);
                        const isSaved = savedMatches[match.membership_id];

                        return (
                            <div 
                                key={`${match.membership_id}-${index}`} 
                                onClick={() => setSelectedMatch(match)}
                                className="relative bg-white border border-slate-100 rounded-2xl p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] flex flex-col sm:flex-row gap-4 hover:-translate-y-0.5 cursor-pointer"
                            >
                                {isTop3 && (
                                    <div className="absolute -top-3 -right-3">
                                        <div className={`
                                            flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold text-white shadow-md
                                            ${index === 0 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : ''}
                                            ${index === 1 ? 'bg-gradient-to-r from-slate-300 to-slate-400' : ''}
                                            ${index === 2 ? 'bg-gradient-to-r from-orange-400 to-amber-600' : ''}
                                        `}>
                                            <Sparkles className="w-3 h-3" />
                                            TOP {index + 1}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center sm:items-start flex-1 gap-4">
                                    <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-[#4A7C59] to-[#3a6146] text-white flex items-center justify-center text-xl font-bold shadow-sm">
                                        {getInitials(match.display_name)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                                            <h3 className="text-lg font-bold text-slate-900 truncate pr-4">
                                                {match.display_name}
                                            </h3>
                                            
                                            <div className="flex items-center gap-2 self-start sm:self-auto">
                                                <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                                                    <Sparkles className="w-4 h-4 text-green-600" />
                                                    <span className="text-sm font-bold">{scorePercent}% Match</span>
                                                </div>
                                                <button 
                                                    onClick={(e) => toggleSaveMatch(match.membership_id, e)}
                                                    className={`p-2 rounded-full transition-colors flex-shrink-0
                                                        ${isSaved ? 'bg-pink-50 text-pink-500' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-pink-400'}
                                                    `}
                                                    aria-label="Guardar Match"
                                                >
                                                    <Heart className="w-5 h-5 pointer-events-none" fill={isSaved ? "currentColor" : "none"} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {tags.map((tag, i) => (
                                                <span 
                                                    key={i} 
                                                    className={`px-2.5 py-1 rounded-md text-xs font-medium ${tag.color}`}
                                                >
                                                    {tag.label}
                                                </span>
                                            ))}
                                            {tags.length === 0 && (
                                                <span className="text-xs text-slate-400 italic py-1">Sin preferencias destacadas</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal for Match Profile */}
            <Dialog open={!!selectedMatch} onOpenChange={(open) => !open && setSelectedMatch(null)}>
                <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto w-[95vw] rounded-2xl">
                    <DialogHeader className="mb-6 flex flex-col items-center justify-center space-y-4 pt-4">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-[#4A7C59] to-[#3a6146] text-white flex items-center justify-center text-3xl font-bold shadow-md">
                            {selectedMatch ? getInitials(selectedMatch.display_name) : ""}
                        </div>
                        <div className="text-center space-y-1.5">
                            <DialogTitle className="text-2xl font-bold text-slate-900 leading-tight">
                                {selectedMatch?.display_name}
                            </DialogTitle>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-200">
                                <Sparkles className="w-4 h-4" />
                                <span className="text-sm font-bold">
                                    {selectedMatch ? Math.round(selectedMatch.score * 100) : 0}% Match
                                </span>
                            </div>
                        </div>
                    </DialogHeader>

                    {selectedMatch && (
                        <div className="space-y-6">
                            {/* Summary Tags Section */}
                            <div className="flex flex-col gap-2">
                                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Atributos Clave</h4>
                                <div className="flex flex-wrap gap-2">
                                    {getTags(selectedMatch).map((tag, i) => (
                                        <span key={i} className={`px-3 py-1.5 rounded-md text-sm font-medium ${tag.color}`}>
                                            {tag.label}
                                        </span>
                                    ))}
                                    {getTags(selectedMatch).length === 0 && (
                                        <span className="text-sm text-slate-400 italic">No hay etiquetas destacadas</span>
                                    )}
                                </div>
                            </div>

                            <div className="h-px bg-slate-100 w-full" />

                            {/* Detailed Profile Information */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                                <DetailItem label="Edad" value={selectedMatch.age ? `${selectedMatch.age} años` : null} />
                                <DetailItem label="Convivencia Fines de Semana" value={
                                    selectedMatch.weekend_return === 'si_siempre' ? "Suele irse a casa" : 
                                    selectedMatch.weekend_return === 'a_veces' ? "A veces se va" : 
                                    selectedMatch.weekend_return === 'no_vuelvo' ? "Se queda en la resi" : null
                                } />
                                <DetailItem label="Ubicación de estudio preferida" value={
                                    selectedMatch.study_location === 'habitacion_silencio' ? "Habitación en silencio" : 
                                    selectedMatch.study_location === 'sala_estudio' ? "Sala de estudio" : 
                                    selectedMatch.study_location === 'biblioteca' ? "Biblioteca" : 
                                    selectedMatch.study_location === 'con_musica' ? "Con música/ruido ambiente" : null
                                } />
                                <DetailItem label="Importancia Planes Fuera" value={
                                    selectedMatch.outside_plans_importance === 'muy_importante' ? "Muy importante (no para en casa)" : 
                                    selectedMatch.outside_plans_importance === 'intermedio' ? "Intermedio" : 
                                    selectedMatch.outside_plans_importance === 'casero' ? "Casero (disfruta su cuarto)" : null
                                } />
                                <DetailItem label="Importancia del Orden" value={selectedMatch.order_importance ? `${selectedMatch.order_importance}/10` : null} />
                                <DetailItem label="Tolerancia al Ruido" value={selectedMatch.noise_tolerance ? `${selectedMatch.noise_tolerance}/10` : null} />
                                <DetailItem label="Preferencia de Visitas" value={
                                    selectedMatch.visitors_preference === 'privado' ? "Eventos en privado" : 
                                    selectedMatch.visitors_preference === 'aviso' ? "Bien con aviso previo" : 
                                    selectedMatch.visitors_preference === 'siempre' ? "Cuarto abierto, le encantan las visitas" : null
                                } />
                                <DetailItem label="Preferencia de Objetos Básicos" value={
                                    selectedMatch.basic_items_preference === 'estricto' ? "Cada uno lo suyo" : 
                                    selectedMatch.basic_items_preference === 'compartir' ? "Compartir y a medias" : 
                                    selectedMatch.basic_items_preference === 'confianza' ? "Invitar con confianza" : null
                                } />
                                <DetailItem label="Preferencia de Temperatura" value={
                                    selectedMatch.temperature_preference === 'friolero' ? "Friolero (ventanas cerradas)" : 
                                    selectedMatch.temperature_preference === 'neutro' ? "Neutro" : 
                                    selectedMatch.temperature_preference === 'caluroso' ? "Caluroso (ventanas abiertas)" : null
                                } />
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function DetailItem({ label, value }: { label: string, value: React.ReactNode }) {
    if (!value) return null;
    return (
        <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
            <span className="text-sm font-medium text-slate-900">{value}</span>
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
