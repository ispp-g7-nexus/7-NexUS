import { ClientCounter, ServerTenantPanel } from "../components/examples";
import { useTenant } from "../hooks";

export function HomePage() {
  const { tenantContext, residence } = useTenant();

  if (!tenantContext) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
        No se encontro contexto de tenant para este dominio.
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <ServerTenantPanel data={tenantContext} />

      <article className="rounded-2xl border border-slate-200 bg-white/70 p-4">
        <p className="mb-3 text-sm font-medium text-slate-700">Datos de residencia</p>
        <ul className="space-y-1 text-sm text-slate-700">
          <li><strong>Nombre:</strong> {residence?.name || "No resuelta"}</li>
          <li><strong>Timezone:</strong> {residence?.timezone || "-"}</li>
          <li><strong>Codigo:</strong> {residence?.code || "-"}</li>
        </ul>
      </article>

      <div className="md:col-span-2">
        <ClientCounter />
      </div>
    </div>
  );
}
