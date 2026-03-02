import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Clock, FileText, Home, Shield, Users, Volume2 } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";

interface CommunityRulesModalProps {
  isOpen: boolean;
  onAccept: (dontShowAgain: boolean) => void;
}

export function CommunityRulesModal({ isOpen, onAccept }: CommunityRulesModalProps) {
  const [hasAccepted, setHasAccepted] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const rules = [
    {
      icon: Volume2,
      title: "Respeto y Silencio",
      description: "Mantén un nivel de ruido moderado, especialmente entre las 23:00 y las 8:00 horas."
    },
    {
      icon: Users,
      title: "Espacios Comunes",
      description: "Deja los espacios compartidos limpios y ordenados después de usarlos."
    },
    {
      icon: Home,
      title: "Cuidado de las Instalaciones",
      description: "Reporta cualquier daño o desperfecto inmediatamente a través de la app."
    },
    {
      icon: Shield,
      title: "Seguridad",
      description: "No compartas las claves de acceso. Utiliza el sistema de invitados para visitas."
    },
    {
      icon: Clock,
      title: "Reservas",
      description: "Respeta los horarios de reserva de espacios comunes y cancela si no vas a asistir."
    },
    {
      icon: FileText,
      title: "Normativa General",
      description: "Cumple con el reglamento interno de la residencia en todo momento."
    }
  ];

  const handleAccept = () => {
    if (hasAccepted) {
      onAccept(dontShowAgain);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop idéntico al de EventForm */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Contenedor principal con los mismos bordes y sombras que EventForm */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-card text-card-foreground border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-lg flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header limpio con border-b */}
              <div className="p-6 border-b border-border shrink-0">
                <h3 className="text-xl font-semibold mb-1 tracking-tight">Normas de Convivencia</h3>
                <p className="text-sm text-muted-foreground">NexUS Residencia</p>
              </div>

              {/* Contenido scrolleable */}
              <div className="p-6 overflow-y-auto space-y-6">
                <p className="text-sm leading-relaxed">
                  Bienvenido/a a nuestra comunidad. Para garantizar una convivencia armoniosa
                  y respetuosa, te pedimos que leas y aceptes las siguientes normas básicas:
                </p>

                {/* Lista de reglas (estilo lista limpia, sin tarjetas anidadas redundantes) */}
                <div className="space-y-5">
                  {rules.map((rule, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5 text-primary">
                        <rule.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <label className="text-sm font-medium leading-none">{rule.title}</label>
                        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                          {rule.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
                  <p className="text-sm text-destructive leading-relaxed">
                    <strong>Importante:</strong> El incumplimiento reiterado de estas normas puede 
                    resultar en sanciones según el reglamento interno de la residencia.
                  </p>
                </div>

                {/* Controles de aceptación */}
                <div className="space-y-4 pt-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <Checkbox
                      checked={hasAccepted}
                      onCheckedChange={(checked) => setHasAccepted(checked as boolean)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 group-hover:text-primary transition-colors">
                        He leído y acepto las normas de convivencia.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Footer con border-t y botones alineados a la derecha */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-border shrink-0 bg-card">
                <Button
                  onClick={handleAccept}
                  disabled={!hasAccepted}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2"
                >
                  {hasAccepted ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aceptar y Continuar
                    </>
                  ) : (
                    "Acepta para continuar"
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}