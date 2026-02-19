import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 text-slate-700">
      <h2 className="text-xl font-semibold text-slate-900">Ruta no encontrada</h2>
      <p className="mt-2">La ruta solicitada no existe.</p>
      <Link
        to="/"
        className="mt-4 inline-flex rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
