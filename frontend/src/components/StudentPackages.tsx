import { Clock, QrCode, Search, MapPin } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "./ui/dialog";

export type SimplePackage = {
  id: number;
  sender?: string;
  tracking?: string;
  date?: string;
  status?: string;
  location?: string;
};

interface StudentPackagesProps {
  packages: SimplePackage[];
  onShowQr?: () => void;
  onMarkViewed?: () => void;
}

export function StudentPackages({ packages, onShowQr }: StudentPackagesProps) {
  return (
    <div className="p-4 space-y-6 min-h-full bg-background pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Paquetería</h1>
        <div className="w-1/3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por remitente o tracking..." className="pl-10 bg-card border-none shadow-sm h-10 rounded-xl" />
        </div>
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button className="w-full bg-foreground text-background shadow-lg" onClick={onShowQr}>
            <QrCode className="w-5 h-5 mr-2" /> Mostrar código QR de recogida
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-xs text-center">
          <DialogHeader>
            <DialogTitle className="text-center">Tu Código de Recogida</DialogTitle>
            <DialogDescription className="text-center">Muestra este QR en recepción</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            <div className="bg-card p-4 rounded-xl border-2 border-dashed border-border">
              <QrCode className="w-32 h-32 text-foreground" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-mono">PIN: 8392</p>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="w-full bg-card p-1 rounded-xl shadow-sm mb-4">
          <TabsTrigger value="pending" className="flex-1 rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-foreground">Pendientes</TabsTrigger>
          <TabsTrigger value="history" className="flex-1 rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-foreground">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          {packages.filter(p => p.status !== 'DELIVERED').map(p => (
            <DeliveryCard key={p.id} sender={p.sender} tracking={p.tracking} date={p.date} status={p.status} location={p.location} />
          ))}
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {packages.filter(p => p.status === 'DELIVERED').map(p => (
            <DeliveryCard key={p.id} sender={p.sender} tracking={p.tracking} date={p.date} status={p.status} location={undefined} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DeliveryCard({ sender, tracking, date, status, location }) {
  const isReady = status && status !== 'DELIVERED';

  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <CardContent className="p-0 flex">
        <div className={`w-1.5 ${isReady ? "bg-chart-2" : "bg-border"}`} />
        <div className="p-4 flex-1">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-bold text-card-foreground">{sender}</h3>
            {isReady ? (
              <Badge className="bg-accent/10 text-accent hover:bg-accent/10 border-none shadow-none">Recoger</Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground border-border">Entregado</Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground mb-3 font-mono">#{tracking}</p>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {date}</span>
            {location && (<span className="flex items-center gap-1 text-chart-2 font-medium"><MapPin className="w-3.5 h-3.5" /> {location}</span>)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default StudentPackages;
