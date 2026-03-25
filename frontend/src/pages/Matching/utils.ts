import type { MatchItem } from "../../services/matching";

export const getInitials = (name: string) => {
    return name
        .split(" ")
        .map((n) => n.replace(/[^a-zA-Z]/g, "")[0])
        .filter(Boolean)
        .join("")
        .slice(0, 2)
        .toUpperCase();
};

export const getTags = (match: MatchItem) => {
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

    if (
        match.habito_fumar_vapear === "no_me_molesta" ||
        match.habito_fumar_vapear === "no_da_igual"
    ) {
        tags.push({ label: "No fumador", color: "bg-emerald-100 text-emerald-800" });
    } else if (match.habito_fumar_vapear === "fumo") {
        tags.push({ label: "Permite Fumar", color: "bg-rose-100 text-rose-800" });
    }

    return tags;
};

export const formatWeekendReturn = (value: string | null | undefined) => {
    if (value === "si_siempre") return "Suele irse a casa";
    if (value === "a_veces") return "A veces se va";
    if (value === "no_vuelvo") return "Se queda en la resi";
    return null;
};

export const formatStudyLocation = (value: string | null | undefined) => {
    if (value === "habitacion_silencio") return "Habitación en silencio";
    if (value === "sala_estudio") return "Sala de estudio";
    if (value === "biblioteca") return "Biblioteca";
    if (value === "con_musica") return "Con música/ruido ambiente";
    return null;
};

export const formatOutsidePlans = (value: string | null | undefined) => {
    if (value === "muy_importante") return "Muy importante (no para en casa)";
    if (value === "intermedio") return "Intermedio";
    if (value === "casero") return "Casero (disfruta su cuarto)";
    return null;
};

export const formatVisitorsPreference = (value: string | null | undefined) => {
    if (value === "privado") return "Eventos en privado";
    if (value === "aviso") return "Bien con aviso previo";
    if (value === "siempre") return "Cuarto abierto, le encantan las visitas";
    return null;
};

export const formatBasicItems = (value: string | null | undefined) => {
    if (value === "estricto") return "Cada uno lo suyo";
    if (value === "compartir") return "Compartir y a medias";
    if (value === "confianza") return "Invitar con confianza";
    return null;
};

export const formatTemperature = (value: string | null | undefined) => {
    if (value === "friolero") return "Friolero (ventanas cerradas)";
    if (value === "neutro") return "Neutro";
    if (value === "caluroso") return "Caluroso (ventanas abiertas)";
    return null;
};
