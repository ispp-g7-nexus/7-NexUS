import { useUser } from "../hooks";

export function UserPage() {
  const { user, isAuthenticated, refreshUser, loading } = useUser();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Contexto de usuario JWT</h2>
        <button
          type="button"
          onClick={() => {
            refreshUser();
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          {loading ? "Recargando..." : "Recargar"}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-700">
        <p><strong>Autenticado:</strong> {isAuthenticated ? "Si" : "No"}</p>
        <p><strong>Usuario:</strong> {user?.username || "-"}</p>
        <p><strong>Email:</strong> {user?.email || "-"}</p>
        <p><strong>Roles:</strong> {user?.roles?.join(", ") || "-"}</p>
      </div>

      <pre className="overflow-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
        {JSON.stringify(user, null, 2)}
      </pre>
    </div>
  );
}
