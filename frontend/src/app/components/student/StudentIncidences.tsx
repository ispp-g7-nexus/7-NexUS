import { useState } from "react";
import {
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  MapPin,
  FileText,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { toast } from "sonner";
import { StudentHeader } from "./StudentHeader";

interface Incidence {
  title: string;
  status: string;
  date: string;
  location: string;
  adminNotes?: string;
  currentStep?: number; // 1: Reportada, 2: En revisión, 3: En progreso, 4: Resuelta
}

export function StudentIncidences() {
  const [incidences, setIncidences] = useState<Incidence[]>([
    {
      title: "Fuga en el baño",
      status: "in_progress",
      date: "Hace 2 horas",
      location: "Habitación 302-B",
      adminNotes: "El equipo de mantenimiento está en camino. Estimado de reparación: 2 horas.",
      currentStep: 3,
    },
    {
      title: "Luz fundida",
      status: "resolved",
      date: "Ayer",
      location: "Pasillo Planta 3",
      adminNotes: "Bombilla reemplazada. Trabajo completado el 18/02/2026 a las 14:30h.",
      currentStep: 4,
    },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!title || !location || !description) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    // Agregar nueva incidencia al inicio de la lista
    const newIncidence: Incidence = {
      title: title,
      status: "in_progress",
      date: "Ahora mismo",
      location: location === "habitacion" ? "Habitación 302-B" : 
                location === "bano" ? "Baño Común" :
                location === "cocina" ? "Cocina" : "Zonas Comunes",
      currentStep: 1,
    };

    setIncidences([newIncidence, ...incidences]);

    // Limpiar formulario
    setTitle("");
    setLocation("");
    setDescription("");

    // Cerrar diálogo
    setIsDialogOpen(false);

    // Mostrar notificación de éxito
    toast.success("Incidencia reportada", {
      description: "Tu reporte ha sido enviado correctamente. El equipo de mantenimiento lo revisará pronto.",
    });
  };

  return (
    <div className="p-4 space-y-4 relative min-h-full">
      <StudentHeader title="Incidencias" />

      {/* Lista de incidencias */}
      <div className="space-y-4">
        {incidences.map((incidence, index) => (
          <IncidenceCard key={index} {...incidence} />
        ))}
      </div>

      {/* Floating Action Button (FAB) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button className="fixed bottom-24 right-4 w-14 h-14 rounded-full shadow-xl bg-accent hover:bg-primary text-white p-0 z-50">
            <Plus className="w-8 h-8" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nueva Incidencia</DialogTitle>
            <DialogDescription>
              Reporta cualquier problema o incidencia en tu residencia
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input
                placeholder="Título del problema"
                className="bg-input-background border-0"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Select value={location} onValueChange={setLocation}>
                <SelectTrigger className="bg-input-background border-0">
                  <SelectValue placeholder="¿Dónde es el problema?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="habitacion">
                    Mi Habitación
                  </SelectItem>
                  <SelectItem value="bano">
                    Baño Común
                  </SelectItem>
                  <SelectItem value="cocina">Cocina</SelectItem>
                  <SelectItem value="otros">
                    Zonas Comunes
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Textarea
                placeholder="Describe qué pasa..."
                className="bg-input-background border-0 min-h-[100px] resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="w-full h-12 border-dashed border-2 text-muted-foreground"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Adjuntar Foto
            </Button>
            <Button 
              className="w-full h-12 bg-accent hover:bg-primary text-white font-bold rounded-xl"
              onClick={handleSubmit}
            >
              Enviar Reporte
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IncidenceCard({ title, status, date, location, adminNotes, currentStep = 1 }: any) {
  const isResolved = status === "resolved";
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);
  
  return (
    <Card className="border-none shadow-sm bg-card overflow-hidden">
      <CardContent className="p-0 flex">
        <div
          className={`w-1.5 ${isResolved ? "bg-accent" : "bg-[#FDB462]"}`}
        />
        <div className="p-4 flex-1">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-bold text-card-foreground">{title}</h3>
            {isResolved ? (
              <Badge
                variant="outline"
                className="bg-accent/10 text-accent border-none"
              >
                Resuelto
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-[#FDB462]/10 text-[#FDB462] border-none"
              >
                En revisión
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {location}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isResolved ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
              {date}
            </div>
            {adminNotes && (
              <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                  >
                    <FileText className="w-3 h-3 mr-1" />
                    Ver notas
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>Notas del Administrador</DialogTitle>
                    <DialogDescription>
                      Información actualizada sobre tu incidencia
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                      <p className="text-sm text-card-foreground leading-relaxed">
                        {adminNotes}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => setIsNotesDialogOpen(false)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Cerrar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}