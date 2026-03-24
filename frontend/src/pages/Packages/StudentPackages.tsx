import { Clock, QrCode, Search, MapPin, LogOut, User } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "../../components/ui/dialog";
import { NotificationBell } from "../../components/announcement/NotificationBell";

export type SimplePackage = {
  id: number;
  sender?: string;
  resident_name?: string;
  tracking?: string;
  date?: string;
  status?: string;
  location?: string;
  is_unread?: boolean;
};

interface StudentPackagesProps {
  packages: SimplePackage[];
  onShowQr?: () => void;
  onMarkViewed?: () => void;
  qrData?: { token: string; expires_at?: string; resident_name?: string } | null;
  onGoToProfile?: () => void;
  onLogout?: () => void;
}

export function StudentPackages({ packages = [], onShowQr, qrData, onGoToProfile, onLogout }: StudentPackagesProps) {
  const pendingPackages = packages.filter((p) => p.status !== "DELIVERED");
  const historyPackages = packages.filter((p) => p.status === "DELIVERED");


  return (
    <div className="flex flex-col w-full bg-background">
      {/* Header */}
      <header className="bg-primary p-6 pt-12 flex justify-between items-center shrink-0 shadow-lg sticky top-0 z-20">
        <h1 className="text-primary-foreground text-2xl font-bold">Paquetería</h1>
        <div className="flex items-center gap-2">
          <div className="hidden md:block w-64 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por remitente o tracking..." className="pl-10 bg-white border-none shadow-sm h-10 rounded-xl" />
          </div>
          <NotificationBell />
          <Button
            size="icon"
            variant="ghost"
            className="text-primary-foreground hover:bg-primary-foreground/20 hover:scale-110 rounded-full transition-all"
            onClick={() => onGoToProfile?.()}
            aria-label="Ir al perfil"
          >
            <User className="w-5 h-5" />
          </Button>
          {onLogout ? (
            <Button
              size="icon"
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/20 hover:scale-110 rounded-full transition-all"
              onClick={onLogout}
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          ) : null}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">

      <Dialog>
        <DialogTrigger asChild>
          <Button className="w-full bg-foreground text-background shadow-lg" onClick={onShowQr}>
            <QrCode className="w-5 h-5 mr-2" /> Mostrar código de recogida
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-xs text-center">
          <DialogHeader>
            <DialogTitle className="text-center">Tu Código de Recogida</DialogTitle>
            <DialogDescription className="text-center">Muestra este código en recepción</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            <div className="bg-gray-50 p-6 rounded-xl border-2 border-dashed border-gray-200 w-full flex items-center justify-center min-h-[120px]">
              {qrData?.token ? (
                <span className="text font-mono font-semibold text-gray-900 break-all">
                  {qrData.token}
                </span>
              ) : (
                <span className="text-sm text-gray-500">Generando código...</span>
              )}
            </div>
          </div>
          {qrData?.resident_name && <p className="text-sm font-medium">{qrData.resident_name}</p>}
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="w-full bg-white p-1 rounded-xl shadow-sm mb-4">
          <TabsTrigger value="pending" className="flex-1 rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-foreground">Pendientes</TabsTrigger>
          <TabsTrigger value="history" className="flex-1 rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-foreground">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          {pendingPackages.length > 0 ? (
            pendingPackages.map((p) => (
              <DeliveryCard key={p.id} sender={p.sender} tracking={p.tracking} date={p.date} status={p.status} location={p.location} is_unread={p.is_unread} />
            ))
          ) : (
            <div className="p-6 bg-white rounded-xl text-center text-sm text-gray-500">No tienes paquetes pendientes.</div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {historyPackages.length > 0 ? (
            historyPackages.map((p) => (
              <DeliveryCard key={p.id} sender={p.sender} tracking={p.tracking} date={p.date} status={p.status} location={undefined} is_unread={p.is_unread} />
            ))
          ) : (
            <div className="p-6 bg-white rounded-xl text-center text-sm text-gray-500">Aún no hay historial de paquetes.</div>
          )}
        </TabsContent>
      </Tabs>
      </main>
    </div>
  );
}

function DeliveryCard({ sender, tracking, date, status, location, is_unread }) {
  const isReady = status && status !== 'DELIVERED';

  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <CardContent className="p-0 flex">
        <div className={`w-1.5 ${isReady ? "bg-chart-2" : "bg-border"}`} />
        <div className="p-4 flex-1">
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-card-foreground">{sender}</h3>
              {is_unread && (
                <Badge className="bg-red-600 text-white text-xs py-0.5 px-2">Nuevo</Badge>
              )}
            </div>
            {isReady ? (
              <Badge className="bg-accent/10 text-accent hover:bg-accent/10 border-none shadow-none">Listo para recoger</Badge>
            ) : (
              <Badge variant="outline" className="text-gray-500 border-gray-200">Entregado</Badge>
            )}
          </div>

          <p className="text-xs text-gray-500 mb-3 font-mono">#{tracking}</p>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {date}</span>
            {location && (<span className="flex items-center gap-1 text-chart-2 font-medium"><MapPin className="w-3.5 h-3.5" /> {location}</span>)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default StudentPackages;