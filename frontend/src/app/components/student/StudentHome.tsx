import {
  Bell,
  QrCode,
  Wifi,
  Utensils,
  Package,
  LogOut,
  MessageSquare,
  Copy,
  Check,
  Clock,
  AlertCircle,
  CalendarDays,
  Megaphone,
  Users,
} from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useUser } from "../../../hooks";

// 1. Definimos la interfaz para las props (opcional pero recomendado en TS)
interface StudentHomeProps {
  onNavigate: (view: string) => void;
  onLogout?: () => void;
}

// 2. Recibimos la prop 'onNavigate' aquí
function getUserDisplayName(user: ReturnType<typeof useUser>["user"]): string {
  const rawName = user?.raw?.name;
  if (typeof rawName === "string" && rawName.trim().length > 0) {
    return rawName.trim();
  }
  if (user?.username && user.username.trim().length > 0) {
    return user.username.trim();
  }
  if (user?.email && user.email.includes("@")) {
    return user.email.split("@", 1)[0];
  }
  return "Residente";
}

function getInitials(text: string): string {
  const clean = text.trim();
  if (!clean) {
    return "R";
  }

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }

  return clean.slice(0, 2).toUpperCase();
}

export function StudentHome({ onNavigate, onLogout }: StudentHomeProps) {
  const { user } = useUser();
  const [isWifiDialogOpen, setIsWifiDialogOpen] = useState(false);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, title: "Evento en 1 hora", read: false },
    { id: 2, title: "Mensaje del administrador", read: false },
    { id: 3, title: "Nuevo evento disponible", read: false },
    { id: 4, title: "Tienes paquetes pendientes", read: true },
    { id: 5, title: "Incidencia resuelta", read: true },
    { id: 6, title: "Mantenimiento programado", read: true },
  ]);
  const wifiPassword = "NexUS2026@Residence";
  const displayName = useMemo(() => getUserDisplayName(user), [user]);
  const userInitials = useMemo(() => getInitials(displayName), [displayName]);

  // Calcular notificaciones sin leer
  const unreadCount = notifications.filter(n => !n.read).length;

  // Marcar todas como leídas al abrir el diálogo
  const handleOpenNotifications = () => {
    setIsNotificationsOpen(true);
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleCopyPassword = () => {
    // Método alternativo que funciona sin Clipboard API
    const textarea = document.createElement('textarea');
    textarea.value = wifiPassword;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
      setCopied(true);
      toast.success("Contraseña copiada", {
        description: "La contraseña WiFi se ha copiado al portapapeles",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Error al copiar", {
        description: "No se pudo copiar la contraseña. Cópiala manualmente: " + wifiPassword,
      });
    } finally {
      document.body.removeChild(textarea);
    }
  };

  return (
    <div className="bg-[#F5F5F5] min-h-full">
      {/* Header Verde Corporativo */}
      <div className="bg-[#1B5E20] pt-12 pb-24 px-6 rounded-b-[2.5rem] relative">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Avatar className="border-2 border-white/30 w-12 h-12">
              <AvatarFallback className="bg-white/20 text-white font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-green-100 text-sm">
                Bienvenido,
              </p>
              <h1 className="text-white text-2xl font-bold">
                {displayName}
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20 rounded-full relative"
              onClick={handleOpenNotifications}
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#F5A623] rounded-full border-2 border-[#1B5E20]" />
              )}
            </Button>
            {onLogout && (
              <Button
                size="icon"
                variant="ghost"
                className="text-white hover:bg-white/20 rounded-full"
                onClick={onLogout}
              >
                <LogOut className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Digital ID Card (Flotante) - Sin cambios ... */}
        <div className="absolute left-6 right-6 -bottom-16">
          <Card className="bg-white shadow-xl shadow-green-900/5 border-none rounded-2xl overflow-hidden">
            <CardContent className="p-0 flex h-32">
              <button
                className="w-24 bg-gray-900 flex flex-col items-center justify-center text-white p-2 text-center hover:bg-gray-800 transition-colors cursor-pointer"
                onClick={() => setIsQrDialogOpen(true)}
              >
                <QrCode className="w-10 h-10 mb-2 opacity-80" />
                <span className="text-[10px] uppercase tracking-wider">
                  Acceso
                </span>
              </button>
              <div className="flex-1 p-4 flex flex-col justify-center">
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">
                  Residente
                </p>
                <p className="text-lg font-bold text-gray-900">
                  Torre A • 302-B
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="bg-[#35C759]/10 text-[#35C759] border-[#35C759]/30"
                  >
                    Activo
                  </Badge>
                  <span className="text-xs text-gray-400">
                    Exp: Jun 2026
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Espaciador */}
      <div className="h-20" />

      {/* Accesos Rápidos - 3. AQUÍ CONECTAMOS LOS BOTONES */}
      <div className="px-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            Servicios Rápidos
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            <QuickAction
              icon={<MessageSquare className="w-6 h-6" />}
              label="Avisos"
              color="bg-[#35C759]/10 text-[#35C759]"
              onClick={() => onNavigate("announcements")}
            />
            <QuickAction
              icon={<Utensils className="w-6 h-6" />}
              label="Menú"
              color="bg-orange-100 text-orange-600"
              onClick={() => onNavigate("menu")}
            />
            <QuickAction
              icon={<Wifi className="w-6 h-6" />}
              label="WiFi"
              color="bg-blue-100 text-blue-600"
              onClick={() => setIsWifiDialogOpen(true)}
            />
            <QuickAction
              icon={<Package className="w-6 h-6" />}
              label="Paquetes"
              color="bg-purple-100 text-purple-600"
              badge="2"
              onClick={() => onNavigate("deliveries")}
            />
            <QuickAction
              icon={<Users className="w-6 h-6" />}
              label="Invitados"
              color="bg-pink-100 text-pink-600"
              onClick={() => onNavigate("visitors")}
            />
          </div>
        </div>

        {/* Próximos Eventos - Sin cambios ... */}
        <div>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Agenda de Hoy
            </h2>
            <button
              className="text-xs font-semibold text-[#35C759]"
              onClick={() => onNavigate("community")} // También puedes conectar este
            >
              Ver todo
            </button>
          </div>
          <div className="space-y-3">
            <EventCard
              time="18:00"
              title="Clase de Yoga"
              location="Gimnasio"
              category="Wellness"
            />
            <EventCard
              time="20:30"
              title="Cena Temática"
              location="Comedor Principal"
              category="Social"
            />
          </div>
        </div>
      </div>

      {/* Dialog para WiFi */}
      <Dialog open={isWifiDialogOpen} onOpenChange={setIsWifiDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Acceso WiFi</DialogTitle>
            <DialogDescription>
              Aquí tienes la contraseña para conectarte a la red WiFi de la residencia.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-gray-900">
              {wifiPassword}
            </p>
            <Button
              size="icon"
              variant="ghost"
              className="text-gray-500 hover:text-gray-900"
              onClick={handleCopyPassword}
            >
              {copied ? (
                <Check className="w-5 h-5" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para QR Code */}
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Código QR de Acceso</DialogTitle>
            <DialogDescription>
              Muestra este código para acceder a las instalaciones
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6 space-y-6">
            <div className="w-64 h-64 bg-white border-4 border-gray-200 rounded-2xl flex items-center justify-center shadow-lg">
              <div className="w-56 h-56 bg-gray-900 rounded-xl flex items-center justify-center">
                <QrCode className="w-48 h-48 text-white" strokeWidth={1.5} />
              </div>
            </div>
            <div className="text-center space-y-2">
              <p className="font-bold text-gray-900 text-lg">{displayName}</p>
              <p className="text-sm text-gray-600">Torre A • Habitación 302-B</p>
              <Badge
                variant="outline"
                className="bg-[#35C759]/10 text-[#35C759] border-[#35C759]/30 mt-2"
              >
                Activo hasta Jun 2026
              </Badge>
            </div>
            <p className="text-xs text-gray-400 text-center px-4">
              Este código QR es personal e intransferible. Úsalo para acceder a la residencia y registrar tu entrada/salida.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para Notificaciones */}
      <Dialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#35C759]" />
              Notificaciones
            </DialogTitle>
            <DialogDescription>
              Mantente al día con los avisos de la residencia
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Notificación de Evento Próximo */}
            <NotificationCard
              icon={<Clock className="w-5 h-5 text-orange-500" />}
              title="Evento en 1 hora"
              description="La Clase de Yoga comienza a las 18:00 en el Gimnasio"
              time="Hace 5 min"
              type="urgent"
            />
            
            {/* Notificación de Administrador */}
            <NotificationCard
              icon={<Megaphone className="w-5 h-5 text-blue-600" />}
              title="Mensaje del administrador"
              description="Recordatorio: La cena de gala se ha trasladado al patio exterior."
              time="Hace 2 horas"
              type="admin"
            />
            
            {/* Notificación de Evento */}
            <NotificationCard
              icon={<CalendarDays className="w-5 h-5 text-purple-600" />}
              title="Nuevo evento disponible"
              description="Cena Temática hoy a las 20:30 en el Comedor Principal. ¡Apúntate!"
              time="Hace 3 horas"
              type="event"
            />
            
            {/* Notificación de Paquete */}
            <NotificationCard
              icon={<Package className="w-5 h-5 text-green-600" />}
              title="Tienes paquetes pendientes"
              description="2 paquetes esperando en recepción"
              time="Ayer"
              type="info"
            />
            
            {/* Notificación de Incidencia Resuelta */}
            <NotificationCard
              icon={<Check className="w-5 h-5 text-green-600" />}
              title="Incidencia resuelta"
              description="Tu reporte de 'Calefacción no funciona' ha sido marcado como resuelto"
              time="Hace 2 días"
              type="success"
            />
            
            {/* Notificación de Mantenimiento */}
            <NotificationCard
              icon={<AlertCircle className="w-5 h-5 text-red-600" />}
              title="Mantenimiento programado"
              description="El gimnasio estará cerrado mañana de 9:00 a 12:00 por mantenimiento"
              time="Hace 3 días"
              type="warning"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NotificationCard({ icon, title, description, time, type }: any) {
  const bgColors = {
    urgent: "bg-orange-50 border-orange-200",
    admin: "bg-blue-50 border-blue-200",
    event: "bg-purple-50 border-purple-200",
    info: "bg-gray-50 border-gray-200",
    success: "bg-green-50 border-green-200",
    warning: "bg-red-50 border-red-200",
  };

  return (
    <div className={`p-4 rounded-xl border ${bgColors[type] || bgColors.info} transition-colors hover:shadow-sm`}>
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-gray-900 text-sm mb-1">
            {title}
          </h4>
          <p className="text-xs text-gray-600 mb-2">
            {description}
          </p>
          <p className="text-xs text-gray-400">
            {time}
          </p>
        </div>
      </div>
    </div>
  );
}

// 4. Modificamos el componente QuickAction para aceptar y usar 'onClick'
function QuickAction({
  icon,
  label,
  color,
  badge,
  onClick,
}: any) {
  return (
    <button
      className="flex flex-col items-center gap-2 group"
      onClick={onClick} // Añadimos el evento aquí
    >
      <div
        className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-active:scale-95 relative ${color}`}
      >
        {icon}
        {badge && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
            {badge}
          </span>
        )}
      </div>
      <span className="text-xs font-medium text-gray-600">
        {label}
      </span>
    </button>
  );
}

// ... EventCard se mantiene igual ...
function EventCard({ time, title, location, category }: any) {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 flex gap-4 items-center shadow-sm">
      <div className="flex flex-col items-center px-3 border-r border-gray-100">
        <span className="text-xs text-gray-400 font-medium">
          HOY
        </span>
        <span className="text-lg font-bold text-gray-900">
          {time}
        </span>
      </div>
      <div>
        <h4 className="font-bold text-gray-900">{title}</h4>
        <p className="text-xs text-gray-500">
          {location} • {category}
        </p>
      </div>
    </div>
  );
}
