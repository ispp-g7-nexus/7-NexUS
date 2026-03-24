import { useState } from "react";
import { Clock, Search, MapPin } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "../../components/ui/dialog";

export type SimplePackage = {
  id: number;
  sender?: string;
  resident_name?: string;
  tracking?: string;
  delivery_code?: string;
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

export function StudentPackages({ packages = [] }: StudentPackagesProps) {
  const [query, setQuery] = useState("");

  const normalize = (s?: string) => (s ?? "").toLowerCase();
  const matchesQuery = (p: SimplePackage) =>
    normalize(p.sender).includes(normalize(query)) ||
    normalize(p.tracking).includes(normalize(query));

  const pendingPackages = packages.filter((p) => p.status !== "DELIVERED" && matchesQuery(p));
  const historyPackages = packages.filter((p) => p.status === "DELIVERED" && matchesQuery(p));


  return (
    <div className="flex flex-col w-full bg-background">
      {/* Header */}
      <header className="bg-primary p-6 pt-12 flex justify-between items-center shrink-0 shadow-lg sticky top-0 z-20">
        <h1 className="text-primary-foreground text-2xl font-bold">Paquetería</h1>
        <div className="w-1/3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por remitente o tracking..."
            className="pl-10 bg-white border-none shadow-sm h-10 rounded-xl"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="w-full bg-white p-1 rounded-xl shadow-sm mb-4">
          <TabsTrigger value="pending" className="flex-1 rounded-lg data-[state=active]:bg-[#dddddd] data-[state=active]:text-foreground">Pendientes</TabsTrigger>
          <TabsTrigger value="history" className="flex-1 rounded-lg data-[state=active]:bg-[#dddddd] data-[state=active]:text-foreground">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          {pendingPackages.length > 0 ? (
            pendingPackages.map((p) => (
              <DeliveryCard key={p.id} sender={p.sender} tracking={p.tracking} delivery_code={p.delivery_code} date={p.date} status={p.status} location={p.location} is_unread={p.is_unread} />
            ))
          ) : (
            <div className="p-6 bg-white rounded-xl text-center text-sm text-gray-500">No tienes paquetes pendientes.</div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          {historyPackages.length > 0 ? (
            historyPackages.map((p) => (
              <DeliveryCard key={p.id} sender={p.sender} tracking={p.tracking} delivery_code={p.delivery_code} date={p.date} status={p.status} location={undefined} is_unread={p.is_unread} />
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

function DeliveryCard({ sender, tracking, delivery_code, date, status, location, is_unread }) {
  const isReady = status && status !== 'DELIVERED';

  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <CardContent className="p-0 !pb-0 flex flex-col">
        <div className="flex">
          <div className={`w-1.5 ${isReady ? "bg-chart-2" : "bg-border"}`} />
          <div className="px-4 pt-2 pb-3 flex-1">
            <div className="flex justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-card-foreground">{sender}</h3>
                  {is_unread && (
                    <Badge className="bg-red-600 text-white text-xs py-0.5 px-2">Nuevo</Badge>
                  )}
                </div>
                <div className="flex flex-col gap-3 text-xs text-gray-500">
                  <span className="font-mono">#{tracking}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {date}</span>
                    {location && (
                      <span className="flex items-center gap-1 text-chart-2 font-medium"><MapPin className="w-3.5 h-3.5" /> {location}</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-6">
                {isReady ? (
                  <Badge className="bg-accent/10 text-accent hover:bg-accent/10 border-none shadow-none">Listo para recoger</Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-500 border-gray-200">Entregado</Badge>
                )}
                
                {isReady && delivery_code && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-[#509550] text-white hover:bg-[#3d7a3d]">
                        Ver código
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Codigo de recogida</DialogTitle>
                        <DialogDescription>
                          Muestra este codigo al personal de recepcion para retirar el paquete correspondiente a {sender}.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex items-center justify-center p-8">
                        <div className="bg-gray-100 px-8 py-5 rounded-2xl border-2 border-dashed border-gray-300">
                          <span className="text-5xl font-mono font-bold tracking-widest text-gray-800">{delivery_code}</span>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default StudentPackages;