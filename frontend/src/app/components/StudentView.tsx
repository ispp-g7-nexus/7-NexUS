import { motion } from "motion/react";
import { AlertCircle, Calendar, Home, MessageSquare, User } from "lucide-react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

import { StudentAnnouncements } from "./student/StudentAnnouncements";
import { StudentCommunity } from "./student/StudentCommunity";
import { StudentDeliveries } from "./student/StudentDeliveries";
import { StudentHome } from "./student/StudentHome";
import { StudentIncidences } from "./student/StudentIncidences";
import { StudentMenu } from "./student/StudentMenu";
import { StudentReservations } from "./student/StudentReservations";
import { StudentVisitors } from "./student/StudentVisitors";

interface StudentViewProps {
  onLogout: () => void;
}

type StudentSection =
  | "home"
  | "incidences"
  | "reservations"
  | "community"
  | "menu"
  | "deliveries"
  | "announcements"
  | "visitors";

const sectionToPath: Record<StudentSection, string> = {
  home: "/dashboard",
  incidences: "/dashboard/incidencias",
  reservations: "/dashboard/reservas",
  community: "/dashboard/social",
  announcements: "/dashboard/avisos",
  menu: "/dashboard/menu",
  deliveries: "/dashboard/paquetes",
  visitors: "/dashboard/invitados",
};

function resolveSectionPath(section: string): string {
  const key = section as StudentSection;
  return sectionToPath[key] || sectionToPath.home;
}

export function StudentView({ onLogout }: StudentViewProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname.replace(/\/+$/, "") || "/dashboard";
  const isTabActive = (path: string) => currentPath === path || currentPath.startsWith(`${path}/`);

  const handleNavigation = (section: string) => {
    navigate(resolveSectionPath(section));
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-[#F5F5F5]">
      <div className="flex-1 overflow-y-auto pb-20">
        <Routes>
          <Route index element={<StudentHome onNavigate={handleNavigation} onLogout={onLogout} />} />
          <Route path="incidencias" element={<StudentIncidences />} />
          <Route path="reservas" element={<StudentReservations />} />
          <Route path="social" element={<StudentCommunity />} />
          <Route path="menu" element={<StudentMenu />} />
          <Route path="paquetes" element={<StudentDeliveries />} />
          <Route path="avisos" element={<StudentAnnouncements />} />
          <Route path="invitados" element={<StudentVisitors />} />
          <Route path="*" element={<StudentHome onNavigate={handleNavigation} onLogout={onLogout} />} />
        </Routes>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-2 pb-6 z-20 max-w-md mx-auto">
        <div className="flex justify-between items-center">
          <NavButton
            icon={<AlertCircle className="w-5 h-5" />}
            label="Incidencias"
            active={isTabActive("/dashboard/incidencias")}
            onClick={() => navigate("/dashboard/incidencias")}
          />
          <NavButton
            icon={<User className="w-5 h-5" />}
            label="Social"
            active={isTabActive("/dashboard/social")}
            onClick={() => navigate("/dashboard/social")}
          />

          <div className="relative -top-5">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/dashboard")}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                isTabActive("/dashboard") &&
                !isTabActive("/dashboard/incidencias") &&
                !isTabActive("/dashboard/social") &&
                !isTabActive("/dashboard/reservas") &&
                !isTabActive("/dashboard/avisos")
                  ? "bg-[#4A7C59] text-white"
                  : "bg-white text-slate-400 border border-slate-100"
              }`}
            >
              <Home className="w-6 h-6" />
            </motion.button>
          </div>

          <NavButton
            icon={<Calendar className="w-5 h-5" />}
            label="Reservas"
            active={isTabActive("/dashboard/reservas")}
            onClick={() => navigate("/dashboard/reservas")}
          />
          <NavButton
            icon={<MessageSquare className="w-5 h-5" />}
            label="Avisos"
            active={isTabActive("/dashboard/avisos")}
            onClick={() => navigate("/dashboard/avisos")}
          />
        </div>
      </nav>
    </div>
  );
}

interface NavButtonProps {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavButton({ icon, label, active, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
        active ? "text-[#4A7C59]" : "text-slate-400 hover:text-slate-600"
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium mt-1">{label}</span>
    </button>
  );
}
