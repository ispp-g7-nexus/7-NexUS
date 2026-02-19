import { useState } from "react";

import { cn } from "../../lib/cn";

export function ClientCounter() {
  const [count, setCount] = useState(0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
      <p className="mb-3 text-sm font-medium text-slate-700">Componente cliente (interactivo)</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setCount((prev) => prev - 1)}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300",
            "text-slate-700 transition hover:bg-slate-100"
          )}
        >
          -
        </button>
        <span className="min-w-10 text-center text-lg font-semibold text-slate-900">{count}</span>
        <button
          type="button"
          onClick={() => setCount((prev) => prev + 1)}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300",
            "text-slate-700 transition hover:bg-slate-100"
          )}
        >
          +
        </button>
      </div>
    </div>
  );
}
