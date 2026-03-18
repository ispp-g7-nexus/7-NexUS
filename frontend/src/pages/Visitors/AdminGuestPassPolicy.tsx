import { Save, Settings2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  getAdminGuestPassPolicy,
  GuestPassApiError,
  updateAdminGuestPassPolicy,
} from "../../services/guestPasses";

type PolicyForm = {
  max_duration_hours: string;
  max_concurrent_passes: string;
};

type PolicyErrors = Partial<Record<keyof PolicyForm, string>>;

const DURATION_MIN = 1;
const DURATION_MAX = 168;
const CONCURRENT_MIN = 1;
const CONCURRENT_MAX = 20;

function validatePolicy(form: PolicyForm): PolicyErrors {
  const errors: PolicyErrors = {};

  const maxDuration = Number(form.max_duration_hours);
  const maxConcurrent = Number(form.max_concurrent_passes);

  if (!Number.isInteger(maxDuration)) {
    errors.max_duration_hours = "Introduce un número entero de horas.";
  } else if (maxDuration < DURATION_MIN || maxDuration > DURATION_MAX) {
    errors.max_duration_hours = `La duración debe estar entre ${DURATION_MIN} y ${DURATION_MAX} horas.`;
  }

  if (!Number.isInteger(maxConcurrent)) {
    errors.max_concurrent_passes = "Introduce un número entero de pases.";
  } else if (maxConcurrent < CONCURRENT_MIN || maxConcurrent > CONCURRENT_MAX) {
    errors.max_concurrent_passes = `El máximo concurrente debe estar entre ${CONCURRENT_MIN} y ${CONCURRENT_MAX}.`;
  }

  return errors;
}

export function AdminGuestPassPolicyPage() {
  const [form, setForm] = useState<PolicyForm>({
    max_duration_hours: "24",
    max_concurrent_passes: "3",
  });
  const [errors, setErrors] = useState<PolicyErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPolicy = async () => {
    setLoading(true);
    try {
      const policy = await getAdminGuestPassPolicy();
      setForm({
        max_duration_hours: String(policy.max_duration_hours),
        max_concurrent_passes: String(policy.max_concurrent_passes),
      });
      setErrors({});
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cargar la configuración de visitantes.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPolicy();
  }, []);

  const setField = <K extends keyof PolicyForm,>(field: K, value: PolicyForm[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handleSave = async () => {
    const nextErrors = validatePolicy(form);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error("Revisa los valores de la configuración.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateAdminGuestPassPolicy({
        max_duration_hours: Number(form.max_duration_hours),
        max_concurrent_passes: Number(form.max_concurrent_passes),
      });
      setForm({
        max_duration_hours: String(updated.max_duration_hours),
        max_concurrent_passes: String(updated.max_concurrent_passes),
      });
      setErrors({});
      toast.success("Configuración de visitantes guardada.");
    } catch (error) {
      if (error instanceof GuestPassApiError) {
        setErrors((error.fieldErrors || {}) as PolicyErrors);
        toast.error(error.message);
      } else {
        toast.error("No se pudo guardar la configuración de visitantes.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6 p-4">
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Settings2 className="h-5 w-5" />
            Política de pases de invitados
          </CardTitle>
          <CardDescription>
            Define por residencia la duración máxima del pase y el número máximo de pases concurrentes por residente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="policy-max-duration">Duración máxima (horas)</Label>
            <Input
              id="policy-max-duration"
              type="number"
              min={DURATION_MIN}
              max={DURATION_MAX}
              value={form.max_duration_hours}
              onChange={(event) => setField("max_duration_hours", event.target.value)}
              aria-invalid={Boolean(errors.max_duration_hours)}
              disabled={loading || saving}
            />
            {errors.max_duration_hours ? (
              <p className="text-xs text-red-600">{errors.max_duration_hours}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Rango permitido: {DURATION_MIN} a {DURATION_MAX} horas.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="policy-max-concurrent">Máximo de pases concurrentes</Label>
            <Input
              id="policy-max-concurrent"
              type="number"
              min={CONCURRENT_MIN}
              max={CONCURRENT_MAX}
              value={form.max_concurrent_passes}
              onChange={(event) => setField("max_concurrent_passes", event.target.value)}
              aria-invalid={Boolean(errors.max_concurrent_passes)}
              disabled={loading || saving}
            />
            {errors.max_concurrent_passes ? (
              <p className="text-xs text-red-600">{errors.max_concurrent_passes}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Rango permitido: {CONCURRENT_MIN} a {CONCURRENT_MAX} pases.
              </p>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => void loadPolicy()} disabled={loading || saving}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Recargar
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={loading || saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Guardando..." : "Guardar configuración"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export default AdminGuestPassPolicyPage;
