import {
  Package,
  Clock,
  CheckCircle2,
  QrCode,
  Search,
  MapPin,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "../ui/dialog";
import { StudentHeader } from "./StudentHeader";

export function StudentDeliveries() {
  return (
    <div className="p-4 space-y-6 min-h-full bg-background pb-20">
      <StudentHeader title="Paquetería" />

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por remitente o tracking..."
          className="pl-10 bg-card border-none shadow-sm h-12 rounded-xl"
        />
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button
            className="w-full bg-foreground text-background shadow-lg"
          >
            <QrCode className="w-5 h-5 mr-2" />
            Mostrar código QR de recogida
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-xs text-center">
          <DialogHeader>
            <DialogTitle className="text-center">
              Tu Código de Recogida
            </DialogTitle>
            <DialogDescription className="text-center">
              Muestra este QR en recepción
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            <div className="bg-card p-4 rounded-xl border-2 border-dashed border-border">
              <QrCode className="w-32 h-32 text-foreground" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            PIN: 8392
          </p>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="w-full bg-card p-1 rounded-xl shadow-sm mb-4">
          <TabsTrigger
            value="pending"
            className="flex-1 rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-foreground"
          >
            Pendientes (2)
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="flex-1 rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-foreground"
          >
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          <DeliveryCard
            sender="Amazon"
            tracking="AMZ-992812"
            date="Hoy, 10:30"
            status="ready"
            location="Recepción Principal"
          />
          <DeliveryCard
            sender="Zara"
            tracking="ZR-112233"
            date="Ayer, 16:45"
            status="ready"
            location="Taquilla Inteligente #4"
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          <DeliveryCard
            sender="Madre (Correos)"
            tracking="ES-998877"
            date="05 Feb"
            status="picked_up"
          />
          <DeliveryCard
            sender="Nike Store"
            tracking="NK-221144"
            date="01 Feb"
            status="picked_up"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DeliveryCard({
  sender,
  tracking,
  date,
  status,
  location,
}: any) {
  const isReady = status === "ready";

  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <CardContent className="p-0 flex">
        <div
          className={`w-1.5 ${isReady ? "bg-chart-2" : "bg-border"}`}
        />
        <div className="p-4 flex-1">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-bold text-card-foreground">
              {sender}
            </h3>
            {isReady ? (
              <Badge className="bg-accent/10 text-accent hover:bg-accent/10 border-none shadow-none">
                Recoger
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-muted-foreground border-border"
              >
                Entregado
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground mb-3 font-mono">
            #{tracking}
          </p>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {date}
            </span>
            {location && (
              <span className="flex items-center gap-1 text-chart-2 font-medium">
                <MapPin className="w-3.5 h-3.5" /> {location}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}