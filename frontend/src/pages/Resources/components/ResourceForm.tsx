import React from 'react';

const TIPO_OPTIONS = [
    { value: 'sala', label: '🏠 Sala' },
    { value: 'pista', label: '🏟️ Pista' },
    { value: 'equipamiento', label: '🎮 Equipamiento' },
    { value: 'otro', label: '📦 Otro' },
];

export function RecursoForm({
    isEditing,
    recurso,
    setRecurso,
    onSubmit,
    onClose,
}: {
    isEditing: boolean;
    recurso: any;
    setRecurso: React.Dispatch<React.SetStateAction<any>>;
    onSubmit: (e: React.FormEvent) => void;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-card text-card-foreground border border-border mt-10 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-lg animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-border">
                    <h3 className="text-xl font-semibold mb-1 tracking-tight">
                        {isEditing ? "Editar Recurso" : "Nuevo Recurso"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {isEditing ? "Modifica los detalles del recurso." : "Añade un nuevo recurso a la residencia."}
                    </p>
                </div>
                <form onSubmit={onSubmit} className="p-6 space-y-5">
                    {/* Nombre */}
                    <div className="space-y-2">
                        <label htmlFor="nombre" className="text-sm font-medium leading-none">Nombre del recurso</label>
                        <input
                            id="nombre"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            placeholder="Ej: Sala de Estudio A"
                            value={recurso.nombre}
                            onChange={(e) => setRecurso({ ...recurso, nombre: e.target.value })}
                            required
                        />
                    </div>

                    {/* Tipo */}
                    <div className="space-y-2">
                        <label htmlFor="tipo" className="text-sm font-medium leading-none">Tipo</label>
                        <select
                            id="tipo"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            value={recurso.tipo}
                            onChange={(e) => setRecurso({ ...recurso, tipo: e.target.value })}
                            required
                        >
                            {TIPO_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Aforo */}
                    <div className="space-y-2">
                        <label htmlFor="aforo" className="text-sm font-medium leading-none">Aforo máximo</label>
                        <input
                            id="aforo"
                            type="number"
                            min="1"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            placeholder="Sin límite"
                            value={recurso.aforo_maximo}
                            onChange={(e) => setRecurso({ ...recurso, aforo_maximo: e.target.value })}
                        />
                    </div>

                    {/* Descripción */}
                    <div className="space-y-2">
                        <label htmlFor="descripcion" className="text-sm font-medium leading-none">Descripción</label>
                        <textarea
                            id="descripcion"
                            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                            placeholder="Describe el recurso, sus características o normas de uso..."
                            value={recurso.descripcion}
                            onChange={(e) => setRecurso({ ...recurso, descripcion: e.target.value })}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
                        <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                            onClick={onClose}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                        >
                            {isEditing ? "Guardar Cambios" : "Crear Recurso"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
