import type { TenantContextPayload } from "../../types/tenant";
import { formatBooleanEs } from "../../lib/format";

interface ServerTenantPanelProps {
  data: TenantContextPayload;
}

export function ServerTenantPanel({ data }: ServerTenantPanelProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white/70 p-4">
      <p className="mb-3 text-sm font-medium text-slate-700">Componente SSR (sin hooks)</p>
      <ul className="space-y-1 text-sm text-slate-700">
        <li><strong>Tenant:</strong> {data.tenant.name}</li>
        <li><strong>Schema:</strong> {data.tenant.schema_name}</li>
        <li><strong>Plan:</strong> {data.tenant.plan?.name || "Sin plan"}</li>
        <li><strong>White label:</strong> {formatBooleanEs(data.tenant.can_use_whitelabel)}</li>
      </ul>
    </article>
  );
}
