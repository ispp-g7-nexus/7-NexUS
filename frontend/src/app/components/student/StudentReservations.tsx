import { useState } from "react";
import {
  Calendar,
  Clock,
  Dumbbell,
  WashingMachine,
  BookOpen,
  Users,
  Wind,
  Shirt,
  Package,
  CheckCircle,
  AlertCircle,
  Check,
  X,
} from "lucide-react";
import { StudentHeader } from "./StudentHeader";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { toast } from "sonner";

interface Reservation {
  name: string;
  date: string;
  time: string;
}

export function StudentReservations() {
  const [isReserveDialogOpen, setIsReserveDialogOpen] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  
  // Estados para trackear reservas y préstamos
  const [spaceReservations, setSpaceReservations] = useState<Map<string, Reservation>>(new Map());
  const [loanRequests, setLoanRequests] = useState<Set<string>>(new Set());

  const handleReserveSpace = (space: any) => {
    if (!space.available) return;
    setSelectedSpace(space);
    setIsReserveDialogOpen(true);
  };

  const handleConfirmReservation = () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Por favor selecciona fecha y hora");
      return;
    }

    // Agregar reserva al mapa
    const newReservations = new Map(spaceReservations);
    newReservations.set(selectedSpace.name, {
      name: selectedSpace.name,
      date: selectedDate,
      time: selectedTime,
    });
    setSpaceReservations(newReservations);

    toast.success("¡Reserva confirmada!", {
      description: `${selectedSpace.name} reservado para ${selectedDate} a las ${selectedTime}`,
    });

    setIsReserveDialogOpen(false);
    setSelectedDate("");
    setSelectedTime("");
  };

  const handleCancelReservation = (spaceName: string) => {
    const newReservations = new Map(spaceReservations);
    newReservations.delete(spaceName);
    setSpaceReservations(newReservations);

    toast.info("Reserva cancelada", {
      description: `Has cancelado tu reserva de ${spaceName}`,
    });
  };

  const handleRequestItem = (itemName: string) => {
    setLoanRequests(new Set([...loanRequests, itemName]));
    toast.success("¡Préstamo solicitado!", {
      description: `Tu solicitud de ${itemName} ha sido enviada. Te notificaremos cuando esté listo para recoger.`,
    });
  };

  const handleCancelLoan = (itemName: string) => {
    const newLoanRequests = new Set(loanRequests);
    newLoanRequests.delete(itemName);
    setLoanRequests(newLoanRequests);

    toast.info("Solicitud cancelada", {
      description: `Has cancelado tu solicitud de ${itemName}`,
    });
  };

  return (
    <div className="min-h-full bg-background">
      <StudentHeader title="Reservas" />

      <Tabs defaultValue="spaces" className="w-full">
        <div className="bg-card px-4 pb-3 border-b border-border">
          <TabsList className="w-full bg-secondary p-1 rounded-xl">
            <TabsTrigger
              value="spaces"
              className="flex-1 rounded-lg data-[state=active]:bg-card"
            >
              Espacios
            </TabsTrigger>
            <TabsTrigger
              value="items"
              className="flex-1 rounded-lg data-[state=active]:bg-card"
            >
              Objetos
            </TabsTrigger>
            <TabsTrigger
              value="active"
              className="flex-1 rounded-lg data-[state=active]:bg-card"
            >
              Activas
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Espacios */}
        <TabsContent value="spaces" className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <SpaceCard
              icon={<BookOpen className="w-8 h-8 text-accent" />}
              name="Sala de Estudio"
              available={true}
              type="space"
              reservation={spaceReservations.get("Sala de Estudio")}
              onReserve={handleReserveSpace}
              onCancel={handleCancelReservation}
            />
            <SpaceCard
              icon={<Dumbbell className="w-8 h-8 text-[#FDB462]" />}
              name="Gimnasio"
              available={true}
              type="space"
              reservation={spaceReservations.get("Gimnasio")}
              onReserve={handleReserveSpace}
              onCancel={handleCancelReservation}
            />
            <SpaceCard
              icon={<WashingMachine className="w-8 h-8 text-[#A78BFA]" />}
              name="Lavandería"
              available={false}
              nextTime="15:00"
              type="space"
              reservation={spaceReservations.get("Lavandería")}
              onReserve={handleReserveSpace}
              onCancel={handleCancelReservation}
            />
            <SpaceCard
              icon={<Users className="w-8 h-8 text-chart-2" />}
              name="Cocina Común"
              available={true}
              type="space"
              reservation={spaceReservations.get("Cocina Común")}
              onReserve={handleReserveSpace}
              onCancel={handleCancelReservation}
            />
          </div>
        </TabsContent>

        {/* Tab Objetos */}
        <TabsContent value="items" className="p-4 space-y-4">
          <div className="space-y-3">
            <ItemCard
              icon={<Wind className="w-6 h-6 text-chart-2" />}
              name="Aspiradora Dyson V11"
              available={true}
              loanPeriod="24 horas"
              location="Almacén Principal"
              stock={2}
              totalStock={3}
              isRequested={loanRequests.has("Aspiradora Dyson V11")}
              onRequest={handleRequestItem}
              onCancel={handleCancelLoan}
            />
            <ItemCard
              icon={<Shirt className="w-6 h-6 text-[#A78BFA]" />}
              name="Plancha de Vapor"
              available={true}
              loanPeriod="12 horas"
              location="Lavandería"
              stock={4}
              totalStock={5}
              isRequested={loanRequests.has("Plancha de Vapor")}
              onRequest={handleRequestItem}
              onCancel={handleCancelLoan}
            />
            <ItemCard
              icon={<Package className="w-6 h-6 text-[#FDB462]" />}
              name="Carrito de Compra"
              available={false}
              loanPeriod="48 horas"
              location="Recepción"
              stock={0}
              totalStock={2}
              returnDate="Mañana, 10:00"
              isRequested={loanRequests.has("Carrito de Compra")}
              onRequest={handleRequestItem}
              onCancel={handleCancelLoan}
            />
            <ItemCard
              icon={<WashingMachine className="w-6 h-6 text-primary" />}
              name="Secador de Ropa"
              available={true}
              loanPeriod="6 horas"
              location="Lavandería"
              stock={1}
              totalStock={2}
              isRequested={loanRequests.has("Secador de Ropa")}
              onRequest={handleRequestItem}
              onCancel={handleCancelLoan}
            />
          </div>
        </TabsContent>

        {/* Tab Activas */}
        <TabsContent value="active" className="p-4 space-y-3">
          <ActiveReservation
            type="item"
            icon={<Wind className="w-5 h-5 text-chart-2" />}
            name="Aspiradora Dyson V11"
            startDate="Hoy, 10:30"
            endDate="Mañana, 10:30"
            remaining="18 horas restantes"
            status="active"
          />
        </TabsContent>
      </Tabs>

      {/* Dialog para Reserva de Espacios */}
      <Dialog open={isReserveDialogOpen} onOpenChange={setIsReserveDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reservar {selectedSpace?.name}</DialogTitle>
            <DialogDescription>
              Selecciona la fecha y hora para tu reserva
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block text-foreground">
                Fecha
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring bg-card"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block text-foreground">
                Hora de inicio
              </label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger className="w-full bg-card">
                  <SelectValue placeholder="Selecciona hora" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="08:00">08:00</SelectItem>
                  <SelectItem value="09:00">09:00</SelectItem>
                  <SelectItem value="10:00">10:00</SelectItem>
                  <SelectItem value="11:00">11:00</SelectItem>
                  <SelectItem value="12:00">12:00</SelectItem>
                  <SelectItem value="13:00">13:00</SelectItem>
                  <SelectItem value="14:00">14:00</SelectItem>
                  <SelectItem value="15:00">15:00</SelectItem>
                  <SelectItem value="16:00">16:00</SelectItem>
                  <SelectItem value="17:00">17:00</SelectItem>
                  <SelectItem value="18:00">18:00</SelectItem>
                  <SelectItem value="19:00">19:00</SelectItem>
                  <SelectItem value="20:00">20:00</SelectItem>
                  <SelectItem value="21:00">21:00</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="bg-accent/10 p-3 rounded-lg text-xs text-accent-foreground">
              <p>Las reservas tienen una duración de 1 hora</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setIsReserveDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-accent hover:bg-primary rounded-xl"
                onClick={handleConfirmReservation}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SpaceCard({ icon, name, available, nextTime, type, reservation, onReserve, onCancel }: any) {
  const isReserved = !!reservation;
  
  return (
    <Card className="border-none shadow-sm bg-card hover:bg-secondary transition-colors rounded-2xl overflow-hidden">
      <CardContent className="p-4 flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
          {icon}
        </div>
        <div className="min-h-[4rem] flex flex-col justify-center">
          <h3 className="font-bold text-card-foreground text-sm leading-tight">
            {name}
          </h3>
          {isReserved ? (
            <div className="text-[10px] text-accent font-medium mt-1 leading-tight">
              <span>{reservation.date} • {reservation.time}</span>
            </div>
          ) : available ? (
            <span className="text-[10px] text-accent font-medium mt-1">
              Disponible ahora
            </span>
          ) : (
            <span className="text-[10px] text-[#FDB462] font-medium mt-1">
              Libre a las {nextTime}
            </span>
          )}
        </div>
        
        <div className="w-full">
          {isReserved ? (
            <div className="flex gap-1.5 w-full">
              <Button
                size="sm"
                className="flex-1 bg-accent/10 text-accent border border-accent/30 h-8 text-[11px] px-1 shadow-none hover:bg-accent/10"
                disabled
              >
                Hecho
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="w-8 h-8 p-0 shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onCancel(name)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant={available ? "default" : "outline"}
              className={`w-full h-8 text-xs rounded-lg transition-all ${
                available
                  ? "bg-accent hover:bg-primary text-white shadow-sm"
                  : "bg-secondary border-border text-muted-foreground cursor-not-allowed"
              }`}
              disabled={!available}
              onClick={() => onReserve({ name, icon, available })}
            >
              {available ? "Reservar" : "Ocupado"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ItemCard({
  icon,
  name,
  available,
  loanPeriod,
  location,
  stock,
  totalStock,
  returnDate,
  isRequested,
  onRequest,
  onCancel,
}: any) {
  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden bg-card">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-bold text-card-foreground text-sm truncate">
                {name}
              </h3>
              {isRequested ? (
                <Badge className="bg-accent/10 text-accent border-accent/30 text-[10px] shrink-0 font-bold">
                  PEDIDO
                </Badge>
              ) : available ? (
                <Badge className="bg-accent/10 text-accent border-accent/30 text-[10px] shrink-0 font-bold">
                  OK
                </Badge>
              ) : (
                <Badge className="bg-[#FDB462]/10 text-[#FDB462] border-[#FDB462]/30 text-[10px] shrink-0 font-bold">
                  OUT
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 mb-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{loanPeriod}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Package className="w-3 h-3" />
                <span className="truncate">{location}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground col-span-2">
                <CheckCircle className="w-3 h-3" />
                <span>Stock: {stock}/{totalStock}</span>
              </div>
              {!available && returnDate && (
                <div className="flex items-center gap-1.5 text-[11px] text-[#FDB462] col-span-2">
                  <AlertCircle className="w-3 h-3" />
                  <span>Retorno: {returnDate}</span>
                </div>
              )}
            </div>

            <div className="w-full">
              {isRequested ? (
                <div className="flex gap-2 w-full">
                  <Button
                    size="sm"
                    className="flex-1 bg-accent/10 text-accent border border-accent/30 hover:bg-accent/10 h-8 text-xs font-medium"
                    disabled
                  >
                    <Check className="w-3.5 h-3.5 mr-1.5" />
                    Solicitado
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-10 h-8 p-0 shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={() => onCancel(name)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant={available ? "default" : "outline"}
                  className={`w-full h-8 text-xs rounded-lg transition-all ${
                    available
                      ? "bg-chart-2 hover:bg-primary text-white"
                      : "bg-secondary border-border text-muted-foreground cursor-not-allowed"
                  }`}
                  disabled={!available}
                  onClick={() => onRequest(name)}
                >
                  {available ? "Solicitar Préstamo" : "No Disponible"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActiveReservation({
  type,
  icon,
  name,
  startDate,
  endDate,
  remaining,
  status,
}: any) {
  const isActive = status === "active";

  return (
    <Card className="border-none shadow-sm overflow-hidden rounded-2xl bg-card">
      <CardContent className="p-0 flex">
        <div
          className={`w-1.5 ${
            isActive ? "bg-chart-2" : "bg-[#A78BFA]"
          }`}
        />
        <div className="p-4 flex-1">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                {icon}
              </div>
              <div>
                <h3 className="font-bold text-card-foreground text-sm">
                  {name}
                </h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  {type === "item" ? "Objeto" : "Espacio"}
                </p>
              </div>
            </div>
            <Badge className="bg-accent/10 text-accent border-accent/30 text-[10px] font-bold">
              EN CURSO
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-1">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{startDate}</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{endDate}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-chart-2">
            <CheckCircle className="w-3 h-3" />
            <span>{remaining}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}