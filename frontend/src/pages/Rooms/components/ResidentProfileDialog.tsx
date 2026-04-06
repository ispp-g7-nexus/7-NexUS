import {
  AlertCircle,
  Home,
  MapPin,
  Music,
  Sparkles,
  User,
  Volume2,
} from "lucide-react";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Badge } from "../../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import type { BedroomResident } from "../../../services/bedrooms";
import type { StudentProfileDetails } from "../../../services/studentProfiles";

interface ResidentProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resident: BedroomResident | null;
  profile: StudentProfileDetails | null;
  loading: boolean;
  error: string | null;
}

const getInitials = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "ST";

const getChronotypeLabel = (value: string) => {
  if (value === "morning") return "Madrugador";
  if (value === "night") return "Nocturno";
  return "Flexible";
};

const getTemperatureLabel = (value: string) => {
  if (value === "cold") return "Frío";
  if (value === "cool") return "Fresco";
  if (value === "hot") return "Muy cálido";
  if (value === "warm") return "Cálido";
  return "Neutra";
};

const getOrderLabel = (value: string) => {
  if (value === "very_organized") return "Muy ordenado";
  if (value === "organized") return "Ordenado";
  if (value === "somewhat_messy") return "Algo desordenado";
  if (value === "very_messy") return "Muy desordenado";
  return "Relajado";
};

function PreferenceCard({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-700">{value}</p>
    </div>
  );
}

function TagSection({
  title,
  icon,
  items,
  variant = "outline",
}: Readonly<{
  title: string;
  icon: ReactNode;
  items: string[];
  variant?: "outline" | "secondary" | "info" | "warning";
}>) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        <span className="text-primary">{icon}</span>
        <span>{title}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} variant={variant} className="rounded-full px-3 py-1 text-xs font-medium">
            {item}
          </Badge>
        ))}
      </div>
    </section>
  );
}

export function ResidentProfileDialog({
  open,
  onOpenChange,
  resident,
  profile,
  loading,
  error,
}: Readonly<ResidentProfileDialogProps>) {
  const interests = [
    ...(profile?.interests ?? []),
    ...(profile?.custom_interests ?? []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl border-slate-200 p-0 overflow-hidden">
        
        <div className="relative max-h-[90vh]">
          
          {/* SCROLL AREA */}
          <div
            className="max-h-[90vh] overflow-y-auto"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <style>
              {`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}
            </style>

            <div className="overflow-hidden rounded-xl">
                <div className="bg-gradient-to-r from-primary/95 via-primary/85 to-primary/70 px-6 py-6 text-primary-foreground">
                <DialogHeader className="mb-0">
                  <DialogTitle className="text-2xl font-semibold text-primary-foreground">
                    Perfil del estudiante
                  </DialogTitle>
                  <DialogDescription className="text-primary-foreground/80">
                    Consulta su información de convivencia y presentación personal.
                  </DialogDescription>
                </DialogHeader>

                {resident && (
                  <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <Avatar className="h-20 w-20 border-4 border-white/30 shadow-sm">
                      <AvatarImage src={profile?.profile_image ?? undefined} alt={profile?.name || resident.full_name} />
                      <AvatarFallback className="bg-white/20 text-xl font-semibold text-white">
                        {getInitials(profile?.name || resident.full_name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-semibold">
                          {profile?.name || resident.full_name}
                        </h3>
                        {profile?.nickname && (
                          <Badge variant="secondary" className="border-white/20 bg-white/15 text-white">
                            @{profile.nickname}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="secondary" className="border-white/20 bg-white/15 text-white">
                          <Home className="mr-1 h-3.5 w-3.5" />
                          Habitación {profile?.room || profile?.room_number || "Sin asignar"}
                        </Badge>
                        {resident.email && (
                          <Badge variant="secondary" className="border-white/20 bg-white/15 text-white">
                            {resident.email}
                          </Badge>
                        )}
                        {profile?.birthplace && (
                          <Badge variant="secondary" className="border-white/20 bg-white/15 text-white">
                            <MapPin className="mr-1 h-3.5 w-3.5" />
                            {profile.birthplace}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-6 bg-white px-6 py-6">
                {loading && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    Cargando perfil...
                  </div>
                )}

                {!loading && error && (
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-8 text-center text-sm text-destructive">
                    {error}
                  </div>
                )}

                {!loading && !error && profile && (
                  <>
                    <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <User className="h-4 w-4 text-primary" />
                        <span>Sobre este estudiante</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {profile.bio || "Todavía no ha añadido una descripción personal."}
                      </p>
                    </section>

                    <section className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <Volume2 className="h-4 w-4 text-primary" />
                        <span>Hábitos de convivencia</span>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <PreferenceCard label="Cronotipo" value={getChronotypeLabel(profile.chronotype)} />
                        <PreferenceCard label="Estudio" value={`${profile.study_level}/5`} />
                        <PreferenceCard label="Ruido" value={`${profile.noise_sensitivity}/5`} />
                        <PreferenceCard label="Temperatura" value={getTemperatureLabel(profile.temperature_preference)} />
                        <PreferenceCard label="Orden" value={getOrderLabel(profile.order_level)} />
                      </div>
                    </section>

                    <TagSection title="Intereses y hobbies" icon={<Sparkles className="h-4 w-4" />} items={interests} variant="info" />
                    <TagSection title="Estilo de vida" icon={<User className="h-4 w-4" />} items={profile.lifestyle} variant="secondary" />
                    <TagSection title="Gustos musicales" icon={<Music className="h-4 w-4" />} items={profile.music_genres} variant="warning" />
                    <TagSection title="Límites y dealbreakers" icon={<AlertCircle className="h-4 w-4" />} items={profile.dealbreakers} />
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-0 left-0 h-16 w-full bg-gradient-to-t from-white via-white/80 to-transparent" />
        </div>
      </DialogContent>
    </Dialog>
  );
}