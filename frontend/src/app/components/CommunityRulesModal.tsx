import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, X, FileText, Users, Volume2, Clock, Shield, Home } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Checkbox } from "./ui/checkbox";

interface CommunityRulesModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

export function CommunityRulesModal({ isOpen, onAccept }: CommunityRulesModalProps) {
  const [hasAccepted, setHasAccepted] = useState(false);

  const rules = [
    {
      icon: Volume2,
      title: "Respeto y Silencio",
      description: "Mantén un nivel de ruido moderado, especialmente entre las 23:00 y las 8:00 horas.",
      color: "text-[#509550]"
    },
    {
      icon: Users,
      title: "Espacios Comunes",
      description: "Deja los espacios compartidos limpios y ordenados después de usarlos.",
      color: "text-[#F97316]"
    },
    {
      icon: Home,
      title: "Cuidado de las Instalaciones",
      description: "Reporta cualquier daño o desperfecto inmediatamente a través de la app.",
      color: "text-[#509550]"
    },
    {
      icon: Shield,
      title: "Seguridad",
      description: "No compartas las claves de acceso. Utiliza el sistema de invitados para visitas.",
      color: "text-[#F97316]"
    },
    {
      icon: Clock,
      title: "Reservas",
      description: "Respeta los horarios de reserva de espacios comunes y cancela si no vas a asistir.",
      color: "text-[#509550]"
    },
    {
      icon: FileText,
      title: "Normativa General",
      description: "Cumple con el reglamento interno de la residencia en todo momento.",
      color: "text-[#F97316]"
    }
  ];

  const handleAccept = () => {
    if (hasAccepted) {
      onAccept();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-lg max-h-[90vh] overflow-hidden"
            >
              <Card className="bg-white shadow-2xl border-gray-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#509550] to-[#3d7a3d] p-6 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">
                          Normas de Convivencia
                        </h2>
                        <p className="text-green-100 text-sm">
                          NexUS Residencia
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)]">
                  <div className="space-y-4 mb-6">
                    <p className="text-gray-600 text-sm leading-relaxed">
                      Bienvenido/a a nuestra comunidad. Para garantizar una convivencia armoniosa 
                      y respetuosa, te pedimos que leas y aceptes las siguientes normas básicas:
                    </p>

                    {/* Rules List */}
                    <div className="space-y-3">
                      {rules.map((rule, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card className="p-4 border-gray-200 hover:shadow-md transition-shadow bg-gray-50/50">
                            <div className="flex gap-3">
                              <div className={`flex-shrink-0 ${rule.color}`}>
                                <rule.icon className="w-5 h-5 mt-0.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 text-sm mb-1">
                                  {rule.title}
                                </h3>
                                <p className="text-gray-600 text-xs leading-relaxed">
                                  {rule.description}
                                </p>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>

                    {/* Important Note */}
                    <div className="bg-orange-50 border-l-4 border-[#F97316] p-4 rounded-r-lg">
                      <p className="text-xs text-orange-900 leading-relaxed">
                        <strong className="font-semibold">Importante:</strong> El incumplimiento 
                        reiterado de estas normas puede resultar en sanciones según el reglamento 
                        interno de la residencia.
                      </p>
                    </div>
                  </div>

                  {/* Acceptance Checkbox */}
                  <div className="border-t border-gray-200 pt-6">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <Checkbox
                        checked={hasAccepted}
                        onCheckedChange={(checked) => setHasAccepted(checked as boolean)}
                        className="mt-0.5 data-[state=checked]:bg-[#509550] data-[state=checked]:border-[#509550]"
                      />
                      <div className="flex-1">
                        <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                          He leído y acepto las normas de convivencia de la residencia. 
                          Me comprometo a cumplirlas durante mi estancia.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-200">
                  <Button
                    onClick={handleAccept}
                    disabled={!hasAccepted}
                    className={`w-full h-14 text-base font-semibold transition-all ${
                      hasAccepted
                        ? "bg-[#509550] hover:bg-[#3d7a3d] text-white shadow-md hover:shadow-lg"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {hasAccepted ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        <span>Aceptar y Continuar</span>
                      </div>
                    ) : (
                      "Acepta las normas para continuar"
                    )}
                  </Button>
                  
                  <p className="text-center text-xs text-gray-400 mt-3">
                    Podrás consultar estas normas en cualquier momento desde tu perfil
                  </p>
                </div>
              </Card>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
