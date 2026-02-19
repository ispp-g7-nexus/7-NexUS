import { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Plus,
  QrCode,
  CheckCircle,
  X,
  History,
  Share2,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { toast } from "sonner";
import { motion } from "motion/react";

export function StudentVisitors() {
  const [visitors, setVisitors] = useState([
    {
      id: 1,
      name: "Laura Gómez",
      date: "2026-02-18",
      time: "16:00",
      status: "active", // active, expired, pending
      code: "VIS-8832",
    },
    {
      id: 2,
      name: "Pablo Ruiz",
      date: "2026-02-14",
      time: "18:30",
      status: "expired",
      code: "VIS-1204",
    },
  ]);

  const [isNewVisitorOpen, setIsNewVisitorOpen] = useState(false);
  const [newVisitor, setNewVisitor] = useState({
    name: "",
    date: "",
    time: "",
  });

  const handleRegisterVisitor = () => {
    if (!newVisitor.name || !newVisitor.date || !newVisitor.time) {
      toast.error("Faltan datos", {
        description: "Por favor completa todos los campos para registrar la visita.",
      });
      return;
    }

    const visitor = {
      id: Date.now(),
      name: newVisitor.name,
      date: newVisitor.date,
      time: newVisitor.time,
      status: "active",
      code: `VIS-${Math.floor(1000 + Math.random() * 9000)}`,
    };

    setVisitors([visitor, ...visitors]);
    setIsNewVisitorOpen(false);
    setNewVisitor({ name: "", date: "", time: "" });
    toast.success("Visita registrada", {
      description: "Se ha generado el código de acceso para tu invitado.",
    });
  };

  return (
    <div className="bg-[#F5F5F5] min-h-screen pb-24">
      {/* Header */}
      <div className="bg-white sticky top-0 z-10 px-6 py-4 shadow-sm flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Mis Visitas</h1>
        <Dialog open={isNewVisitorOpen} onOpenChange={setIsNewVisitorOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-[#7BD14F] to-[#35C759] text-white rounded-full shadow-lg shadow-green-500/20 hover:from-[#35C759] hover:to-[#1B5E20]">
              <Plus className="w-5 h-5 mr-1" /> Nuevo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Invitado</DialogTitle>
              <DialogDescription>
                Genera un código QR temporal para que tu visita pueda acceder.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Nombre del visitante
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Nombre completo"
                    className="pl-9"
                    value={newVisitor.name}
                    onChange={(e) =>
                      setNewVisitor({ ...newVisitor, name: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Fecha
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="date"
                      className="pl-9"
                      value={newVisitor.date}
                      onChange={(e) =>
                        setNewVisitor({ ...newVisitor, date: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Hora llegada
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="time"
                      className="pl-9"
                      value={newVisitor.time}
                      onChange={(e) =>
                        setNewVisitor({ ...newVisitor, time: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
              <Button
                className="w-full bg-[#35C759] hover:bg-[#1B5E20] text-white mt-4"
                onClick={handleRegisterVisitor}
              >
                Generar Pase
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="p-6 space-y-6">
        {/* Active Passes */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Pases Activos
          </h2>
          <div className="space-y-4">
            {visitors
              .filter((v) => v.status === "active")
              .map((visitor) => (
                <motion.div
                  key={visitor.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="overflow-hidden border-none shadow-md">
                    <div className="bg-[#35C759] p-4 flex justify-between items-center text-white">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-5 h-5 opacity-80" />
                        <span className="font-mono font-bold tracking-widest">
                          {visitor.code}
                        </span>
                      </div>
                      <Badge className="bg-white/20 hover:bg-white/30 text-white border-none">
                        Válido
                      </Badge>
                    </div>
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {visitor.name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <Calendar className="w-4 h-4" />
                            <span>{visitor.date}</span>
                            <span className="mx-1">•</span>
                            <Clock className="w-4 h-4" />
                            <span>{visitor.time}</span>
                          </div>
                        </div>
                        <div className="w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center">
                          <QrCode className="w-12 h-12 text-white" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 border-gray-200 text-gray-600"
                          onClick={() => {
                             toast.success("Enlace copiado", { description: "Enlace de invitación copiado al portapapeles" });
                          }}
                        >
                          <Share2 className="w-4 h-4 mr-2" />
                          Compartir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            {visitors.filter((v) => v.status === "active").length === 0 && (
              <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300">
                <User className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm">No tienes visitas activas</p>
              </div>
            )}
          </div>
        </section>

        {/* History */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Historial
            </h2>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-100">
            {visitors
              .filter((v) => v.status !== "active")
              .map((visitor) => (
                <div key={visitor.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{visitor.name}</p>
                      <p className="text-xs text-gray-500">
                        {visitor.date} a las {visitor.time}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-gray-400 border-gray-200">
                    Expirado
                  </Badge>
                </div>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
