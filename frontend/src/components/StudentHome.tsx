import {
    Bell,
    Check,
    Copy,
    LogOut,
    Megaphone,
    MessageSquare,
    Package,
    QrCode,
    Users,
    Utensils,
    Wifi
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { authService } from "../services/auth";

import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

export type StudentTab = "home" | "incidences" | "reservations" | "community" | "matches" | "announcements" | "menu" | "deliveries" | "visitors";

interface StudentHomeProps {
    onNavigate: (view: StudentTab) => void;
    onLogout?: () => void;
}

export function StudentHome({ onNavigate, onLogout }: StudentHomeProps) {
    // --- ESTADOS DE LA VISTA ---
    const [isWifiDialogOpen, setIsWifiDialogOpen] = useState(false);
    const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    // Estado para los datos reales del usuario
    const [userData, setUserData] = useState({
        name: "Cargando...",
        initials: "--",
        room: "Obteniendo datos...",
        status: "Cargando"
    });

    const [notifications, setNotifications] = useState([
        { id: 1, title: "Mensaje del administrador", read: false },
        { id: 2, title: "Tienes paquetes pendientes", read: true },
        { id: 3, title: "Incidencia resuelta", read: true },
    ]);

    const wifiPassword = "NexUS2026@Residence";
    const unreadCount = notifications.filter(n => !n.read).length;

    // --- CARGA DE DATOS REALES ---
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const session = await authService.me();
                if (session.user) {
                    // Extraemos el nombre (puedes cambiarlo a session.user.first_name si tu backend lo envía)
                    const rawName = session.user.username || session.user.email || "Estudiante";
                    // Limpiamos el nombre por si es un email (ej: maria@nexus.com -> maria)
                    const cleanName = rawName.split('@')[0].replace(/[._-]/g, ' ');
                    const capitalizedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

                    // Sacamos las iniciales para el Avatar
                    const initials = cleanName.substring(0, 2).toUpperCase();

                    setUserData({
                        name: capitalizedName,
                        initials: initials,
                        // Nota: Si en el futuro tu backend envía la habitación en el me(), cámbialo aquí.
                        // Por ahora ponemos un texto dinámico o genérico.
                        room: "Residente",
                        status: "Activo"
                    });
                }
            } catch (error) {
                console.error("Error cargando perfil del estudiante", error);
                setUserData(prev => ({ ...prev, name: "Estudiante", room: "Error de conexión" }));
            }
        };

        fetchUserData();
    }, []);

    // --- FUNCIONES INTERNAS ---
    const handleOpenNotifications = () => {
        setIsNotificationsOpen(true);
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    const handleCopyPassword = () => {
        const textarea = document.createElement('textarea');
        textarea.value = wifiPassword;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        try {
            document.execCommand('copy');
            setCopied(true);
            toast.success("Contraseña copiada", { description: "La contraseña WiFi se ha copiado al portapapeles" });
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error("Error al copiar");
        } finally {
            document.body.removeChild(textarea);
        }
    };

    return (
        <div className="bg-[#F5F5F5] min-h-full">
            {/* Header Verde Corporativo con Datos Reales */}
            <div className="bg-[#1B5E20] pt-12 pb-24 px-6 rounded-b-[2.5rem] relative">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <Avatar className="border-2 border-white/30 w-12 h-12">
                            <AvatarFallback className="bg-white/20 text-white font-bold">
                                {userData.initials}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-green-100 text-sm">Bienvenido/a,</p>
                            <h1 className="text-white text-2xl font-bold truncate max-w-[180px]">
                                {userData.name}
                            </h1>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 rounded-full relative" onClick={handleOpenNotifications}>
                            <Bell className="w-6 h-6" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#F5A623] rounded-full border-2 border-[#1B5E20]" />
                            )}
                        </Button>
                        {onLogout && (
                            <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 rounded-full" onClick={onLogout}>
                                <LogOut className="w-5 h-5" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Digital ID Card con Datos Reales */}
                <div className="absolute left-6 right-6 -bottom-16">
                    <Card className="bg-white shadow-xl shadow-green-900/5 border-none rounded-2xl overflow-hidden">
                        <CardContent className="p-0 flex h-32">
                            <button className="w-24 bg-gray-900 flex flex-col items-center justify-center text-white p-2 text-center hover:bg-gray-800 transition-colors cursor-pointer" onClick={() => setIsQrDialogOpen(true)}>
                                <QrCode className="w-10 h-10 mb-2 opacity-80" />
                                <span className="text-[10px] uppercase tracking-wider">Acceso</span>
                            </button>
                            <div className="flex-1 p-4 flex flex-col justify-center">
                                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Membresía</p>
                                <p className="text-lg font-bold text-gray-900">{userData.room}</p>
                                <div className="mt-2 flex items-center gap-2">
                                    <Badge variant="outline" className="bg-[#35C759]/10 text-[#35C759] border-[#35C759]/30">
                                        {userData.status}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="h-20" />

            {/* Accesos Rápidos */}
            <div className="px-6 pb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Servicios Rápidos</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    <QuickAction icon={<MessageSquare className="w-6 h-6" />} label="Avisos" color="bg-[#35C759]/10 text-[#35C759]" onClick={() => onNavigate("announcements")} />
                    <QuickAction icon={<Utensils className="w-6 h-6" />} label="Menú" color="bg-orange-100 text-orange-600" onClick={() => onNavigate("menu")} />
                    <QuickAction icon={<Wifi className="w-6 h-6" />} label="WiFi" color="bg-blue-100 text-blue-600" onClick={() => setIsWifiDialogOpen(true)} />
                    <QuickAction icon={<Package className="w-6 h-6" />} label="Paquetes" color="bg-purple-100 text-purple-600" onClick={() => onNavigate("deliveries")} />
                    <QuickAction icon={<Users className="w-6 h-6" />} label="Invitados" color="bg-pink-100 text-pink-600" onClick={() => onNavigate("visitors")} />
                </div>
            </div>

            {/* --- DIALOGS (WIFI, QR Y NOTIFICACIONES) --- */}
            <Dialog open={isWifiDialogOpen} onOpenChange={setIsWifiDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Acceso WiFi</DialogTitle>
                        <DialogDescription>Aquí tienes la contraseña para conectarte a la red WiFi de la residencia.</DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900">{wifiPassword}</p>
                        <Button size="icon" variant="ghost" className="text-gray-500 hover:text-gray-900" onClick={handleCopyPassword}>
                            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Código QR de Acceso</DialogTitle>
                        <DialogDescription>Muestra este código para acceder a las instalaciones</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center py-6 space-y-6">
                        <div className="w-64 h-64 bg-white border-4 border-gray-200 rounded-2xl flex items-center justify-center shadow-lg">
                            <div className="w-56 h-56 bg-gray-900 rounded-xl flex items-center justify-center">
                                <QrCode className="w-48 h-48 text-white" strokeWidth={1.5} />
                            </div>
                        </div>
                        <div className="text-center space-y-2">
                            <p className="font-bold text-gray-900 text-lg">{userData.name}</p>
                            <p className="text-sm text-gray-600">{userData.room}</p>
                            <Badge variant="outline" className="bg-[#35C759]/10 text-[#35C759] border-[#35C759]/30 mt-2">{userData.status}</Badge>
                        </div>
                        <p className="text-xs text-gray-400 text-center px-4">Este código QR es personal e intransferible. Úsalo para acceder a la residencia y registrar tu entrada/salida.</p>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                <DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-[#35C759]" /> Notificaciones
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 mt-2">
                        <NotificationCard icon={<Megaphone className="w-5 h-5 text-blue-600" />} title="Mensaje del administrador" description="Recordatorio: Por favor revisa las normas de convivencia." time="Hace 2 horas" type="admin" />
                        <NotificationCard icon={<Package className="w-5 h-5 text-green-600" />} title="Tienes paquetes pendientes" description="1 paquete esperando en recepción" time="Ayer" type="info" />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

import { ReactNode } from "react";

type NotificationType = "urgent" | "admin" | "event" | "info" | "success" | "warning";

interface NotificationCardProps {
    icon: ReactNode;
    title: string;
    description: string;
    time: string;
    type: NotificationType;
}

interface QuickActionProps {
    icon: ReactNode;
    label: string;
    color: string;
    badge?: string | number;
    onClick: () => void;
}

function NotificationCard({ icon, title, description, time, type }: NotificationCardProps) {
    const bgColors: Record<NotificationType, string> = {
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
                    <h4 className="font-bold text-gray-900 text-sm mb-1">{title}</h4>
                    <p className="text-xs text-gray-600 mb-2">{description}</p>
                    <p className="text-xs text-gray-400">{time}</p>
                </div>
            </div>
        </div>
    );
}

function QuickAction({ icon, label, color, badge, onClick }: QuickActionProps) {
    return (
        <button className="flex flex-col items-center gap-2 group" onClick={onClick}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-active:scale-95 relative ${color}`}>
                {icon}
                {badge && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
                        {badge}
                    </span>
                )}
            </div>
            <span className="text-xs font-medium text-gray-600">{label}</span>
        </button>
    );
}