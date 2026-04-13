import { useState } from "react";
import {
  Users,
  BedDouble,
  UserCheck,
  BookOpen,
  AlertCircle,
  Utensils,
  Package,
  Calendar,
  BarChart2,
} from "lucide-react";
import { PeopleAnalytics } from "./components/PeopleAnalytics";
import { RoomsAnalytics } from "./components/RoomsAnalytics";
import { VisitorsAnalytics } from "./components/VisitorsAnalytics";
import { ReservationsAnalytics } from "./components/ReservationsAnalytics";
import { IncidencesAnalytics } from "./components/IncidencesAnalytics";
import { DiningAnalytics } from "./components/DiningAnalytics";
import { PackagesAnalytics } from "./components/PackagesAnalytics";
import { EventsAnalytics } from "./components/EventsAnalytics";
import { useIsMobile } from "../../components/ui/use-mobile";

type AnalyticsModule =
  | "general"
  | "people"
  | "rooms"
  | "visitors"
  | "reservations"
  | "incidences"
  | "dining"
  | "packages"
  | "events";

const analyticsModules: {
  id: AnalyticsModule;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: "general", label: "General", icon: BarChart2 },
  { id: "people", label: "Personas", icon: Users },
  { id: "rooms", label: "Habitaciones", icon: BedDouble },
  { id: "visitors", label: "Visitantes", icon: UserCheck },
  { id: "reservations", label: "Reservas", icon: BookOpen },
  { id: "incidences", label: "Incidencias", icon: AlertCircle },
  { id: "dining", label: "Comedor", icon: Utensils },
  { id: "packages", label: "Paquetería", icon: Package },
  { id: "events", label: "Eventos", icon: Calendar },
];

function AnalyticsNav({
  activeModule,
  onSelectModule,
}: {
  activeModule: AnalyticsModule;
  onSelectModule: (module: AnalyticsModule) => void;
}) {
  return (
    <nav className="space-y-1">
      {analyticsModules.map((mod) => (
        <button
          key={mod.id}
          onClick={() => onSelectModule(mod.id)}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
            activeModule === mod.id
              ? "bg-primary/10 text-primary font-medium"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <mod.icon className="w-5 h-5" />
          <span>{mod.label}</span>
        </button>
      ))}
    </nav>
  );
}

export function AdminAnalytics() {
  const [activeModule, setActiveModule] =
    useState<AnalyticsModule>("general");
  const isMobile = useIsMobile();

  const renderContent = () => {
    switch (activeModule) {
      case "people":
        return <PeopleAnalytics />;
      case "rooms":
        return <RoomsAnalytics />;
      case "visitors":
        return <VisitorsAnalytics />;
      case "reservations":
        return <ReservationsAnalytics />;
      case "incidences":
        return <IncidencesAnalytics />;
      case "dining":
        return <DiningAnalytics />;
      case "packages":
        return <PackagesAnalytics />;
      case "events":
        return <EventsAnalytics />;
      case "general":
      default:
        return (
          <div className="text-center p-8 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold">Visión General</h3>
            <p className="text-sm text-gray-500">
              Selecciona un módulo para ver las analíticas detalladas.
            </p>
          </div>
        );
    }
  };

  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border">
          <div className="px-4 overflow-x-auto">
            <nav className="flex space-x-1">
              {analyticsModules.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={`shrink-0 flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors ${
                    activeModule === mod.id
                      ? "border-b-2 border-primary text-primary"
                      : "border-b-2 border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <mod.icon className="w-4 h-4" />
                  <span>{mod.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
        <main className="flex-1 p-4 overflow-y-auto">{renderContent()}</main>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <aside className="w-64 border-r bg-gray-50/50 p-4">
        <h2 className="text-lg font-semibold mb-4">Módulos de Analíticas</h2>
        <AnalyticsNav
          activeModule={activeModule}
          onSelectModule={setActiveModule}
        />
      </aside>
      <main className="flex-1 p-6 overflow-y-auto">{renderContent()}</main>
    </div>
  );
}
