import React, { useEffect, useState } from "react";
import { BASE_URL, fetchWithAuth } from "../../utils/api";
import { MisReservas, RecursosList } from "./components/ResourceComponents";
import { RecursoDetails } from "./components/ResourceDetails";
import { RecursoForm } from "./components/ResourceForm";
import "./Resources.css";

const RECURSOS_URL = `${BASE_URL}/recursos/`;
const RESERVAS_URL = `${BASE_URL}/reservas/`;

export function Recursos() {
    const [recursos, setRecursos] = useState<any[]>([]);
    const [misReservas, setMisReservas] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUnauthorized, setIsUnauthorized] = useState(false);
    const [activeTab, setActiveTab] = useState<'recursos' | 'mis-reservas'>('recursos');

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isEditingRecurso, setIsEditingRecurso] = useState(false);
    const [editingRecursoId, setEditingRecursoId] = useState<number | null>(null);

    const [selectedRecurso, setSelectedRecurso] = useState<any>(null);
    const [recursoReservas, setRecursoReservas] = useState<any[]>([]);

    const [newRecurso, setNewRecurso] = useState({
        nombre: "",
        tipo: "sala",
        aforo_maximo: "",
        descripcion: "",
    });

    useEffect(() => {
        fetchRecursos();
        fetchMisReservas();
    }, []);

    const handleUnauthorized = () => setIsUnauthorized(true);

    const fetchRecursos = async () => {
        try {
            const response = await fetchWithAuth(RECURSOS_URL);
            if (response.status === 401 || response.status === 403) { handleUnauthorized(); return; }
            if (response.ok) setRecursos(await response.json());
        } catch (error) {
            console.error("Error fetching recursos:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMisReservas = async () => {
        try {
            const response = await fetchWithAuth(RESERVAS_URL);
            if (response.status === 401 || response.status === 403) { handleUnauthorized(); return; }
            if (response.ok) setMisReservas(await response.json());
        } catch (error) {
            console.error("Error fetching reservas:", error);
        }
    };

    const handleOpenDetails = async (recurso: any) => {
        setSelectedRecurso(recurso);
        setRecursoReservas([]);
        try {
            const response = await fetchWithAuth(`${RECURSOS_URL}${recurso.id}/reservas/`);
            if (response.ok) setRecursoReservas(await response.json());
        } catch (error) {
            console.error("Error fetching reservas del recurso:", error);
        }
    };

    const handleSaveRecurso = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const method = isEditingRecurso ? 'PUT' : 'POST';
            const url = isEditingRecurso ? `${RECURSOS_URL}${editingRecursoId}/` : RECURSOS_URL;

            const response = await fetchWithAuth(url, {
                method,
                body: JSON.stringify({
                    nombre: newRecurso.nombre,
                    tipo: newRecurso.tipo,
                    aforo_maximo: newRecurso.aforo_maximo ? parseInt(newRecurso.aforo_maximo) : null,
                    descripcion: newRecurso.descripcion,
                }),
            });

            if (response.status === 401 || response.status === 403) { handleUnauthorized(); return; }

            if (response.ok) {
                alert(isEditingRecurso ? "Recurso actualizado con éxito." : "Recurso creado con éxito.");
                setIsFormOpen(false);
                setIsEditingRecurso(false);
                setEditingRecursoId(null);
                resetRecursoForm();
                fetchRecursos();
            } else {
                const data = await response.json();
                alert(`Error: ${JSON.stringify(data.detail || data)}`);
            }
        } catch (error) {
            console.error("Error saving recurso:", error);
            alert("Error de conexión al guardar el recurso");
        }
    };

    const handleDeleteRecurso = async (recursoId: number) => {
        if (!window.confirm("¿Eliminar este recurso? Se cancelarán todas sus reservas.")) return;
        try {
            const response = await fetchWithAuth(`${RECURSOS_URL}${recursoId}/`, { method: 'DELETE' });
            if (response.status === 401 || response.status === 403) { handleUnauthorized(); return; }
            if (response.ok || response.status === 204) {
                alert("Recurso eliminado.");
                setSelectedRecurso(null);
                fetchRecursos();
                fetchMisReservas();
            } else {
                const data = await response.json();
                alert(`Error: ${JSON.stringify(data.detail || data)}`);
            }
        } catch (error) {
            alert("Error de conexión al eliminar");
        }
    };

    const handleCrearReserva = async (recursoId: number, fechaInicio: string, fechaFin: string) => {
        try {
            const response = await fetchWithAuth(RESERVAS_URL, {
                method: 'POST',
                body: JSON.stringify({ id_recurso: recursoId, fecha_inicio: fechaInicio, fecha_fin: fechaFin }),
            });
            if (response.status === 401 || response.status === 403) { handleUnauthorized(); return; }
            const data = await response.json();
            if (response.ok) {
                alert("¡Reserva creada correctamente!");
                fetchMisReservas();
                handleOpenDetails(selectedRecurso); // refresh reservas
            } else {
                alert(data.detail || "Error al crear la reserva");
            }
        } catch (error) {
            alert("Error de conexión");
        }
    };

    const handleCancelarReserva = async (reservaId: number) => {
        if (!window.confirm("¿Cancelar esta reserva?")) return;
        try {
            const response = await fetchWithAuth(`${RESERVAS_URL}${reservaId}/`, { method: 'DELETE' });
            if (response.status === 401 || response.status === 403) { handleUnauthorized(); return; }
            if (response.ok) {
                alert("Reserva cancelada.");
                fetchMisReservas();
                if (selectedRecurso) handleOpenDetails(selectedRecurso);
            } else {
                const data = await response.json();
                alert(data.detail || "Error al cancelar");
            }
        } catch (error) {
            alert("Error de conexión");
        }
    };

    const resetRecursoForm = () => setNewRecurso({ nombre: "", tipo: "sala", aforo_maximo: "", descripcion: "" });

    if (isUnauthorized) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[80vh] text-center w-full max-w-2xl mx-auto px-4">
                <h2 className="text-2xl font-bold mb-4 text-foreground">Acceso Denegado</h2>
                <p className="text-muted-foreground max-w-sm leading-relaxed mb-6">
                    Debes iniciar sesión para ver y reservar recursos de tu residencia.
                </p>
                <button
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-lg font-medium transition-colors"
                    onClick={() => window.location.href = '/login'}
                >
                    Ir a Iniciar Sesión
                </button>
            </div>
        );
    }

    return (
        <div className="w-full mx-auto flex flex-col gap-6 pb-20 px-4 sm:px-6 lg:px-8 pt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Recursos de la Residencia</h2>
                {/* Staff-only: crear recurso — check is done inside the button rendering */}
                <button
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap recursos-create-btn"
                    onClick={() => {
                        resetRecursoForm();
                        setIsEditingRecurso(false);
                        setEditingRecursoId(null);
                        setIsFormOpen(true);
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Añadir Recurso
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-border pb-1">
                {(['recursos', 'mis-reservas'] as const).map((tab) => (
                    <button
                        key={tab}
                        className={`px-4 py-2 font-medium text-sm transition-colors relative ${activeTab === tab ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab === 'recursos' ? 'Recursos Disponibles' : 'Mis Reservas'}
                        {activeTab === tab && <div className="absolute bottom-[-5px] left-0 right-0 h-[2px] bg-primary rounded-full" />}
                    </button>
                ))}
            </div>

            {/* Form modal */}
            {isFormOpen && (
                <RecursoForm
                    isEditing={isEditingRecurso}
                    recurso={newRecurso}
                    setRecurso={setNewRecurso}
                    onSubmit={handleSaveRecurso}
                    onClose={() => setIsFormOpen(false)}
                />
            )}

            {/* Detail modal */}
            <RecursoDetails
                recurso={selectedRecurso}
                reservas={recursoReservas}
                onClose={() => setSelectedRecurso(null)}
                onDelete={handleDeleteRecurso}
                onCrearReserva={handleCrearReserva}
                onCancelarReserva={handleCancelarReserva}
                onEdit={(recurso) => {
                    setNewRecurso({
                        nombre: recurso.nombre,
                        tipo: recurso.tipo,
                        aforo_maximo: recurso.aforo_maximo?.toString() || "",
                        descripcion: recurso.descripcion || "",
                    });
                    setEditingRecursoId(recurso.id);
                    setIsEditingRecurso(true);
                    setIsFormOpen(true);
                    setSelectedRecurso(null);
                }}
            />

            {activeTab === 'recursos' ? (
                <RecursosList
                    recursos={recursos}
                    loading={loading}
                    onOpen={handleOpenDetails}
                />
            ) : (
                <MisReservas
                    reservas={misReservas}
                    loading={loading}
                    onCancelar={handleCancelarReserva}
                />
            )}
        </div>
    );
}
