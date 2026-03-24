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

const URL_MAX_LENGTH = 200;

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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Apply live preview styles
  useEffect(() => {
    const styleId = "branding-preview-styles";
    let style = document.getElementById(styleId) as HTMLStyleElement | null;
    
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }

    style.textContent = `
      .branding-preview {
        --preview-primary: ${form.primary_color};
        --preview-secondary: ${form.secondary_color};
        --preview-accent: ${form.accent_color};
      }
      .branding-preview .preview-btn-primary {
        background-color: var(--preview-primary);
      }
      .branding-preview .preview-btn-primary:hover {
        filter: brightness(0.9);
      }
      .branding-preview .preview-card {
        border-color: var(--preview-primary);
      }
      .branding-preview .preview-card-header {
        background-color: var(--preview-primary);
      }
      .branding-preview .preview-badge {
        background-color: var(--preview-secondary);
      }
      .branding-preview .preview-accent-line {
        background-color: var(--preview-accent);
      }
    `;

    return () => {
      if (style && style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, [form.primary_color, form.secondary_color, form.accent_color]);

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

  const validateUrl = (url: string): string => {
    const trimmed = url.trim();
    if (!trimmed) return "";

    if (trimmed.length > URL_MAX_LENGTH) {
      return `La URL no debe exceder ${URL_MAX_LENGTH} caracteres (${trimmed.length} actual)`;
    }

    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      return "La URL debe comenzar con http:// o https://";
    }

    return "";
  };

  const handleColorChange = (field: keyof BrandingFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleInputChange = (field: keyof BrandingFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    
    if (field === "logo_url" || field === "favicon_url") {
      const error = validateUrl(value);
      if (error) {
        setFieldErrors((prev) => ({ ...prev, [field]: error }));
      } else {
        setFieldErrors((prev) => ({ ...prev, [field]: "" }));
      }
    } else if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleReset = () => {
    setForm(initialForm);
    setFieldErrors({});
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (form.logo_url) {
      const error = validateUrl(form.logo_url);
      if (error) errors.logo_url = error;
    }

    if (form.favicon_url) {
      const error = validateUrl(form.favicon_url);
      if (error) errors.favicon_url = error;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
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

    if (!validateForm()) {
      toast.error("Por favor, corrige los errores del formulario.");
      return;
    }

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
                <div className="flex items-center justify-between">
                  <span className="block text-sm font-medium text-gray-700">URL del logo</span>
                  <span className={`text-xs ${
                    form.logo_url.length > URL_MAX_LENGTH
                      ? "text-red-600 font-medium"
                      : "text-gray-500"
                  }`}>
                    {form.logo_url.length} / {URL_MAX_LENGTH}
                  </span>
                </div>
                <input
                  type="url"
                  value={form.logo_url}
                  onChange={(event) => handleInputChange("logo_url", event.target.value)}
                  maxLength={URL_MAX_LENGTH}
                  className={`h-10 w-full rounded-lg border px-3 text-sm outline-none transition-colors ${
                    fieldErrors.logo_url
                      ? "border-red-500 bg-red-50 focus:border-red-600"
                      : "border-gray-300 focus:border-green-500"
                  }`}
                  placeholder="https://mi-residencia.com/logo.png"
                />
                {fieldErrors.logo_url && (
                  <p className="text-xs text-red-600 font-medium mt-1">{fieldErrors.logo_url}</p>
                )}
              </label>
              <label className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="block text-sm font-medium text-gray-700">URL del favicon</span>
                  <span className={`text-xs ${
                    form.favicon_url.length > URL_MAX_LENGTH
                      ? "text-red-600 font-medium"
                      : "text-gray-500"
                  }`}>
                    {form.favicon_url.length} / {URL_MAX_LENGTH}
                  </span>
                </div>
                <input
                  type="url"
                  value={form.favicon_url}
                  onChange={(event) => handleInputChange("favicon_url", event.target.value)}
                  maxLength={URL_MAX_LENGTH}
                  className={`h-10 w-full rounded-lg border px-3 text-sm outline-none transition-colors ${
                    fieldErrors.favicon_url
                      ? "border-red-500 bg-red-50 focus:border-red-600"
                      : "border-gray-300 focus:border-green-500"
                  }`}
                  placeholder="https://mi-residencia.com/favicon.ico"
                />
                {fieldErrors.favicon_url && (
                  <p className="text-xs text-red-600 font-medium mt-1">{fieldErrors.favicon_url}</p>
                )}
              </label>
            </div>
          </section>

          <section className="branding-preview rounded-xl border border-gray-200 bg-gray-50 p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Previsualización</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="preview-card rounded-lg border-2 border-gray-300 bg-white overflow-hidden">
                  <div className="preview-card-header bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 text-white">
                    <h4 className="text-sm font-semibold">Tarjeta de ejemplo</h4>
                  </div>
                  <div className="p-4 space-y-2">
                    <p className="text-xs text-gray-600">Contenido de tarjeta con el color primario en el encabezado</p>
                    <div className="preview-accent-line h-1 w-12 rounded"></div>
                  </div>
                </div>

                <div className="flex flex-col justify-center gap-3">
                  <button className="preview-btn-primary rounded-lg px-4 py-2 text-sm font-medium text-white transition-all">
                    Botón principal
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="preview-badge rounded-full px-3 py-1 text-xs font-semibold text-white">
                      Badge secundario
                    </span>
                    <div className="h-8 w-8 preview-accent-line rounded-full"></div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <div className="mx-auto h-12 w-12 preview-btn-primary rounded-lg mb-2"></div>
                    <p className="text-xs font-medium text-gray-700">Primario</p>
                  </div>
                  <div className="text-center">
                    <div className="mx-auto h-12 w-12 preview-badge rounded-lg mb-2"></div>
                    <p className="text-xs font-medium text-gray-700">Secundario</p>
                  </div>
                  <div className="text-center">
                    <div className="mx-auto h-12 w-12 preview-accent-line rounded-lg mb-2"></div>
                    <p className="text-xs font-medium text-gray-700">Acento</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 pt-6">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Restablecer cambios
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
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
