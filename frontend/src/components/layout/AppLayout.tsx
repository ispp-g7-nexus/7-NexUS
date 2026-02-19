import { NavLink, Outlet } from "react-router-dom";
import type { CSSProperties } from "react";

import { cn } from "../../lib/cn";
import { useTenant, useUser } from "../../hooks";

function navClassName(isActive: boolean) {
  return cn(
    "rounded-lg px-3 py-2 text-sm font-medium transition",
    isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
  );
}

export function AppLayout() {
  const { tenantContext, hasWhitelabel } = useTenant();
  const { user, isAuthenticated } = useUser();

  const branding = tenantContext?.residence?.branding;
  const themeVars = {
    "--primary": branding?.primary_color || "#0f4c81",
    "--secondary": branding?.secondary_color || "#f4b400",
    "--accent": branding?.accent_color || "#2e7d32",
  } as CSSProperties;

  return (
    <main style={themeVars} className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <section className="mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
        <header className="border-l-[8px] border-l-[var(--primary)] bg-gradient-to-r from-slate-50 to-white px-8 py-6">
          <h1 className="text-2xl font-bold tracking-tight">NexUS SSR Router</h1>
          <p className="mt-1 text-sm text-slate-600">
            Dominio: <strong className="text-[var(--accent)]">{tenantContext?.domain || "sin tenant"}</strong>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Usuario: <strong>{isAuthenticated ? user?.username : "anonimo"}</strong>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            White label: <strong>{hasWhitelabel ? "activo" : "inactivo"}</strong>
          </p>
        </header>

        <nav className="flex flex-wrap gap-2 border-b border-slate-200 px-8 py-4">
          <NavLink to="/nexus-data" className={({ isActive }) => navClassName(isActive)} end>
            Inicio
          </NavLink>
          <NavLink to="/nexus-data/tenant" className={({ isActive }) => navClassName(isActive)}>
            Tenant
          </NavLink>
          <NavLink to="/nexus-data/usuario" className={({ isActive }) => navClassName(isActive)}>
            Usuario
          </NavLink>
        </nav>

        <div className="px-8 py-8">
          <Outlet />
        </div>
      </section>
    </main>
  );
}
