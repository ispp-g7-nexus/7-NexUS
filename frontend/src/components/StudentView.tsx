import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Calendar, Home, MessageSquare, User } from "lucide-react";
import { toast } from "sonner";

// Importamos la página de inicio y el tipo de las pestañas
import { StudentHome, StudentTab } from "./StudentHome";
import { PackagesPage } from "../pages/Packages/Packages";

// Páginas / Servicios
import { SocialHub } from "../pages/Social/SocialHub.tsx";
import { StudentAnnouncements } from "../pages/announcements/StudentAnnouncements";
import StudentIncidences from "../pages/Incidences/components/StudentIncidences";
import { MyMatchesPage } from "../pages/Matching/MyMatchesPage";
import { ResidentMenuView } from "../pages/Menu/ResidentMenuView";
import announcementService from "../services/announcement.service";
import { StudentReservations } from "./StudentReservations";

interface StudentViewProps {
    onLogout: () => void;
}

const HOME_INCIDENCES_SEEN_AT_KEY = "home-incidences-seen-at";

export function StudentView({ onLogout }: StudentViewProps) {
    const [activeTab, setActiveTab] = useState<StudentTab>("home");
    const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
    const previousUnreadCount = useRef<number | null>(null);
    const markAsViewedTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        const loadUnreadCount = async () => {
            try {
                const data = await announcementService.getUnviewedCount();
                const nextCount = data.count;

                if (
                    previousUnreadCount.current !== null
                    && nextCount > previousUnreadCount.current
                    && activeTab !== "announcements"
                ) {
                    toast.info("Tienes un nuevo aviso disponible", {
                        description: "Revisa la pestaña Avisos para verlo.",
                    });
                }

                previousUnreadCount.current = nextCount;
                setUnreadAnnouncements(data.count);
            } catch {
                setUnreadAnnouncements(0);
            }
        };

        loadUnreadCount();

        const intervalId = window.setInterval(loadUnreadCount, 15000);
        return () => window.clearInterval(intervalId);
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === "incidences") {
            window.localStorage.setItem(HOME_INCIDENCES_SEEN_AT_KEY, new Date().toISOString());
        }

        if (activeTab !== "announcements") {
            if (markAsViewedTimeoutRef.current) {
                window.clearTimeout(markAsViewedTimeoutRef.current);
                markAsViewedTimeoutRef.current = null;
            }
            return;
        }

        const markAsViewed = async () => {
            try {
                await announcementService.markAsViewed();
                previousUnreadCount.current = 0;
                setUnreadAnnouncements(0);
            } catch {
                // Ignorado: no bloquea la navegación
            }
        };

        markAsViewedTimeoutRef.current = window.setTimeout(() => {
            markAsViewed();
            markAsViewedTimeoutRef.current = null;
        }, 5000);

        return () => {
            if (markAsViewedTimeoutRef.current) {
                window.clearTimeout(markAsViewedTimeoutRef.current);
                markAsViewedTimeoutRef.current = null;
            }
        };
    }, [activeTab]);

    const handleNavigation = (tab: StudentTab) => {
        setActiveTab(tab);
    };

    const renderContent = () => {
        // 1. El Home maneja sus propios márgenes (diseño de borde a borde)
        if (activeTab === "home") {
            return <StudentHome onNavigate={handleNavigation} onLogout={onLogout} />;
        }

        // 2. Evaluamos el resto de pestañas
        let tabContent;
        switch (activeTab) {
            case "incidences":
                tabContent = <StudentIncidences />;
                break;
            case "reservations":
                tabContent = <StudentReservations />;
                break;
            case "community":
                tabContent = <SocialHub />;
                break;
            case "events":
                tabContent = <SocialHub initialTab="eventos" />;
                break;
            case "matches":
                tabContent = <MyMatchesPage />;
                break;
            case "announcements":
                tabContent = <StudentAnnouncements />;
                break;
            case "packages":
                tabContent = <PackagesPage />;
                break;
            case "menu":
                tabContent = <ResidentMenuView />;
                break;
            default:
                tabContent = <div className="p-8 text-center text-gray-500">Módulo en construcción</div>;
                break;
        }

        // 3. Devolvemos el contenido envuelto en el div con "p-4"
        return (
            <div className="p-4 h-full">
                {tabContent}
            </div>
        );
    };

    return (
        <div className="min-h-screen flex flex-col w-full bg-background relative">
            <div className="flex-1 overflow-y-auto pb-20">
                {renderContent()}
            </div>

            <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-6 py-2 pb-6 z-20 w-full shadow-[0_-4px_15px_rgba(0,0,0,0.02)]">
                <div className="flex justify-between items-center">
                    <NavButton icon={<AlertCircle className="w-5 h-5" />} label="Incidencias" active={activeTab === "incidences"} onClick={() => setActiveTab("incidences")} />
                    <NavButton icon={<User className="w-5 h-5" />} label="Social" active={activeTab === "community" || activeTab === "events"} onClick={() => setActiveTab("community")} />
                    <div className="relative -top-5">
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setActiveTab("home")} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${activeTab === "home" ? "bg-secondary-brand text-white" : "bg-white text-slate-400 border border-slate-100"}`}>
                            <Home className="w-6 h-6" />
                        </motion.button>
                    </div>
                    <NavButton icon={<Calendar className="w-5 h-5" />} label="Reservas" active={activeTab === "reservations"} onClick={() => setActiveTab("reservations")} />
                    <NavButton icon={<MessageSquare className="w-5 h-5" />} label="Avisos" active={activeTab === "announcements"} onClick={() => setActiveTab("announcements")} showIndicator={unreadAnnouncements > 0} />
                </div>
            </nav>
        </div>
    );
}

function NavButton({ icon, label, active, onClick, showIndicator = false }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, showIndicator?: boolean }) {
    return (
        <button onClick={onClick} className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${active ? "text-[#4A7C59]" : "text-slate-400 hover:text-slate-600"}`}>
            {showIndicator && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            )}
            {icon}
            <span className="text-[10px] font-medium mt-1">{label}</span>
        </button>
    );
}
