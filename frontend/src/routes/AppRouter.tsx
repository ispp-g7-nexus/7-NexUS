import { Route, Routes } from "react-router-dom";

import { useAppData } from "../providers/AppDataProvider";

function TenantHomePage() {
  const { tenantContext, requestHost, protocol } = useAppData();

  if (!tenantContext) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-semibold">Tenant no encontrado</h1>
        <p className="mt-2 text-sm text-slate-600">
          Host: {requestHost || "-"} · Protocolo: {protocol}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">{tenantContext.tenant.name}</h1>
      <p className="mt-2 text-sm text-slate-600">Dominio: {tenantContext.domain}</p>

      <section className="mt-6 rounded border border-slate-200 bg-white p-4">
        <p className="text-sm">
          <strong>Tenant ID:</strong> {tenantContext.tenant.id}
        </p>
        <p className="mt-1 text-sm">
          <strong>Slug:</strong> {tenantContext.tenant.slug}
        </p>
        <p className="mt-1 text-sm">
          <strong>Schema:</strong> {tenantContext.tenant.schema_name}
        </p>
        <p className="mt-1 text-sm">
          <strong>Activo:</strong> {tenantContext.tenant.is_active ? "Si" : "No"}
        </p>
      </section>

      <section className="mt-4 rounded border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium">Residencia</p>
        {tenantContext.residence ? (
          <p className="mt-1 text-sm">{tenantContext.residence.name}</p>
        ) : (
          <p className="mt-1 text-sm text-slate-600">Sin residencia asociada.</p>
        )}
      </section>
    </main>
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<TenantHomePage />} />
      <Route path="/test" element={<TenantHomePage />} />
    </Routes>
  );
}
