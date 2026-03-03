import { motion } from "framer-motion";
import { AlertCircle, Calendar, Home, MessageSquare, User } from "lucide-react";
import { useState } from "react";
import { Events } from "../pages/Events/Events";
import { StudentAnnouncements } from "../pages/announcements/StudentAnnouncements";

interface StudentViewProps {
    onLogout: () => void;
}

type StudentTab = "home" | "incidences" | "reservations" | "community" | "menu" | "deliveries" | "announcements" | "visitors";

export function StudentView({ onLogout }: StudentViewProps) {
    const [activeTab, setActiveTab] = useState<StudentTab>("home");

    const handleNavigation = (view: string) => {
        setActiveTab(view as StudentTab);
    };

    const renderContent = () => {
        switch (activeTab) {
            case "home": return <StudentHome onNavigate={handleNavigation} onLogout={onLogout} />;
            case "incidences": return <StudentIncidences />;
            case "reservations": return <StudentReservations />;
            case "community": return <Events />;
            case "announcements": return <StudentAnnouncements />;
            default: return <div className="p-8 text-center text-gray-500">Módulo en construcción</div>;
        }
    };

    return (
        <div className="min-h-screen flex flex-col w-full bg-background relative">
            <div className="flex-1 overflow-y-auto pb-20 p-4">
                {renderContent()}
            </div>

            <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-6 py-2 pb-6 z-20 w-full shadow-[0_-4px_15px_rgba(0,0,0,0.02)]">
                <div className="flex justify-between items-center">
                    <NavButton icon={<AlertCircle className="w-5 h-5" />} label="Incidencias" active={activeTab === "incidences"} onClick={() => setActiveTab("incidences")} />
                    <NavButton icon={<User className="w-5 h-5" />} label="Social" active={activeTab === "community"} onClick={() => setActiveTab("community")} />
                    <div className="relative -top-5">
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setActiveTab("home")} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${activeTab === "home" ? "bg-[#4A7C59] text-white" : "bg-white text-slate-400 border border-slate-100"}`}>
                            <Home className="w-6 h-6" />
                        </motion.button>
                    </div>
                    <NavButton icon={<Calendar className="w-5 h-5" />} label="Reservas" active={activeTab === "reservations"} onClick={() => setActiveTab("reservations")} />
                    <NavButton icon={<MessageSquare className="w-5 h-5" />} label="Avisos" active={activeTab === "announcements"} onClick={() => setActiveTab("announcements")} />
                </div>
            </nav>
        </div>
    );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
    return (
        <button onClick={onClick} className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${active ? "text-[#4A7C59]" : "text-slate-400 hover:text-slate-600"}`}>
            {icon}
            <span className="text-[10px] font-medium mt-1">{label}</span>
        </button>
    );
}

interface StudentHomeProps {
    onNavigate: (view: string) => void;
    onLogout: () => void;
}

// Componentes Ficticios para evitar errores de compilación
function StudentHome({ onLogout }: StudentHomeProps) { return <div className="p-4 bg-white rounded-xl shadow-sm text-center"><h2>Inicio Estudiante</h2><button onClick={onLogout} className="mt-4 text-red-500">Cerrar Sesión</button></div>; }
function StudentIncidences() { return <div>Mis Incidencias</div>; }
function StudentReservations() { return <div>Mis Reservas</div>; }