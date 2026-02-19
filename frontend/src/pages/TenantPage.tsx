import { useTenant } from "../hooks";

export function TenantPage() {
  const { tenantContext, refreshTenant, loading } = useTenant();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Contexto de tenant</h2>
        <button
          type="button"
          onClick={() => {
            void refreshTenant();
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          {loading ? "Recargando..." : "Recargar"}
        </button>
      </div>

      <pre className="overflow-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
        {JSON.stringify(tenantContext, null, 2)}
      </pre>
    </div>
  );
}
