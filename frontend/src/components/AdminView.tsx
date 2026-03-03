import { AlertCircle, Bell, LayoutDashboard, LogOut, Menu, Users, Calendar } from "lucide-react";
import { useState } from "react";
import { Events } from "../pages/Social/Events/Events";
import { Residents } from "../pages/Residents/Residents";
import logo from "../assets/logo.png";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";

interface AdminViewProps {
    onLogout: () => void;
}

type AdminTab = "dashboard" | "rooms" | "students" | "incidences" | "reservations" | "kitchen" | "analytics" | "staff" | "announcements" | "visitors" | "events";

export function AdminView({ onLogout }: AdminViewProps) {
    const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
    const [notifications] = useState([{ id: 1, title: "Nueva reserva", message: "Sala reservada", time: "Hace 5 min", read: false }]);

    const allNavItems = [
        { id: "dashboard", label: "Panel de Control", icon: <LayoutDashboard className="w-5 h-5" /> },
        { id: "students", label: "Residentes", icon: <Users className="w-5 h-5" /> },
        { id: "incidences", label: "Incidencias", icon: <AlertCircle className="w-5 h-5" /> },
        { id: "events", label: "Eventos & Comunidad", icon: <Calendar className="w-5 h-5" /> },
    ];

    const currentTab = allNavItems.find((item) => item.id === activeTab) || allNavItems[0];

    return (
        <div className="min-h-screen flex flex-col w-full bg-background relative">
            <header className="bg-card border-b border-border px-4 py-3 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setActiveTab("dashboard")} className="w-9 h-9 flex items-center justify-center">
                            <img src={logo} alt="NexUS Logo" className="w-full h-full object-contain" />
                        </button>
                        <div>
                            <h1 className="font-semibold text-gray-900">{currentTab?.label}</h1>
                            <p className="text-xs text-gray-500">Panel de Administración</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-gray-500 w-9 h-9 relative">
                                    <Bell className="w-5 h-5" />
                                    {notifications.some(n => !n.read) && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white" />}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-4">Notificaciones aquí</PopoverContent>
                        </Popover>

                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-gray-500 w-9 h-9">
                                    <Menu className="w-5 h-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-72 flex flex-col">
                                <SheetHeader><SheetTitle>Menú</SheetTitle><SheetDescription className="sr-only">Navegación</SheetDescription></SheetHeader>
                                <div className="mt-6 space-y-2 flex-1">
                                    {allNavItems.map((item) => (
                                        <SheetTrigger key={item.id} asChild>
                                            <button onClick={() => setActiveTab(item.id as AdminTab)} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 rounded-xl">
                                                {item.icon} {item.label}
                                            </button>
                                        </SheetTrigger>
                                    ))}
                                </div>
                                <div className="pt-6 border-t mt-auto">
                                    <Button variant="outline" className="w-full justify-start text-red-600" onClick={onLogout}>
                                        <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
                                    </Button>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === "events" ? (
                    <Events />
                ) : activeTab === "students" ? (
                    <Residents />
                ) : (
                    <div className="bg-white p-6 rounded-xl text-center text-gray-500 shadow-sm">
                        Vista de {currentTab.label} en construcción
                    </div>
                )}
            </div>
        </div>
    );
}