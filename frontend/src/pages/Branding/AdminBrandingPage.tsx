import { FormEvent, useEffect, useState } from "react";
import { ImageIcon, Loader2, Palette } from "lucide-react";
import { toast } from "sonner";

import {
  brandingService,
  type ResidenceBranding,
  type UpdateResidenceBrandingPayload,
} from "../../services/branding";

type BrandingFormState = {
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url: string;
  favicon_url: string;
};

const INITIAL_FORM: BrandingFormState = {
  primary_color: "#0F4C81",
  secondary_color: "#F4B400",
  accent_color: "#2E7D32",
  logo_url: "",
  favicon_url: "",
};

function mapBrandingToForm(branding: ResidenceBranding): BrandingFormState {
  return {
    primary_color: branding.primary_color || INITIAL_FORM.primary_color,
    secondary_color: branding.secondary_color || INITIAL_FORM.secondary_color,
    accent_color: branding.accent_color || INITIAL_FORM.accent_color,
    logo_url: branding.logo_url || "",
    favicon_url: branding.favicon_url || "",
  };
}

export function AdminBrandingPage() {
  const [form, setForm] = useState<BrandingFormState>(INITIAL_FORM);
  const [initialForm, setInitialForm] = useState<BrandingFormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string>("");

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const branding = await brandingService.get();
        const mapped = mapBrandingToForm(branding);
        setForm(mapped);
        setInitialForm(mapped);
        setUpdatedAt(branding.updated_at);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo cargar la personalización";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    loadBranding();
  }, []);

  const handleColorChange = (field: keyof BrandingFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (field: keyof BrandingFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setForm(initialForm);
  };

  const buildPayload = (): UpdateResidenceBrandingPayload => ({
    primary_color: form.primary_color,
    secondary_color: form.secondary_color,
    accent_color: form.accent_color,
    logo_url: form.logo_url.trim(),
    favicon_url: form.favicon_url.trim(),
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSaving(true);
    try {
      const saved = await brandingService.update(buildPayload());
      const mapped = mapBrandingToForm(saved);
      setForm(mapped);
      setInitialForm(mapped);
      setUpdatedAt(saved.updated_at);
      globalThis.dispatchEvent(new CustomEvent("tenant-branding-updated", { detail: saved }));
      toast.success("Personalización guardada correctamente");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar la personalización";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando personalización...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Personalización de interfaz</h2>
            <p className="mt-1 text-sm text-gray-500">
              Configura la identidad visual de la residencia. Los cambios se guardan por tenant.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
            Última actualización: {updatedAt ? new Date(updatedAt).toLocaleString("es-ES") : "Sin datos"}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <section>
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Palette className="h-4 w-4 text-primary" />
              Paleta base
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                { field: "primary_color", label: "Color principal" },
                { field: "secondary_color", label: "Color secundario" },
                { field: "accent_color", label: "Color acento" },
              ].map((item) => (
                <label key={item.field} className="space-y-2 rounded-xl border border-gray-200 p-3">
                  <span className="block text-sm font-medium text-gray-500">{item.label}</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form[item.field as keyof BrandingFormState] as string}
                      onChange={(event) => handleColorChange(item.field as keyof BrandingFormState, event.target.value)}
                      className="h-10 w-14 cursor-pointer rounded border border-gray-200 bg-white"
                    />
                    <input
                      type="text"
                      value={form[item.field as keyof BrandingFormState] as string}
                      onChange={(event) => handleInputChange(item.field as keyof BrandingFormState, event.target.value)}
                      className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-primary"
                      placeholder="#000000"
                    />
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
              <ImageIcon className="h-4 w-4 text-primary" />
              Recursos de marca
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="block text-sm font-medium text-gray-500">URL del logo</span>
                <input
                  type="url"
                  value={form.logo_url}
                  onChange={(event) => handleInputChange("logo_url", event.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-primary"
                  placeholder="https://mi-residencia.com/logo.png"
                />
              </label>
              <label className="space-y-2">
                <span className="block text-sm font-medium text-gray-500">URL del favicon</span>
                <input
                  type="url"
                  value={form.favicon_url}
                  onChange={(event) => handleInputChange("favicon_url", event.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-primary"
                  placeholder="https://mi-residencia.com/favicon.ico"
                />
              </label>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Restablecer cambios
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar personalización
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
