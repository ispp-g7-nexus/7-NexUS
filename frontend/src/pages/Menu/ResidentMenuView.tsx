import { Clock, Flame, Leaf, LogOut, User, Loader2, Send, MessageSquare } from "lucide-react";
import { useState, useEffect, JSX } from "react";
import { MenuWeek, MenuDay, Meal } from "../../types/menu.types";
import { NotificationBell } from "../../components/announcement/NotificationBell";
import { Button } from "../../components/ui/button";

interface ResidentMenuViewProps {
  menuWeek?: MenuWeek;
  onGoToProfile?: () => void;
  onLogout?: () => void;
}
import menuService from "../../services/menu.service";
import { toast } from "sonner";

const getMealTypeLabel = (type: Meal['type']): string => {
  switch (type) {
    case 'breakfast': return 'Desayuno';
    case 'lunch': return 'Comida';
    case 'dinner': return 'Cena';
    case 'snack': return 'Merienda';
    default: return type;
  }
};

const getMealTypeColor = (type: Meal['type']): string => {
  switch (type) {
    case 'breakfast': return 'bg-yellow-50 border-yellow-200';
    case 'lunch': return 'bg-blue-50 border-blue-200';
    case 'dinner': return 'bg-purple-50 border-purple-200';
    case 'snack': return 'bg-orange-50 border-orange-200';
    default: return 'bg-gray-50 border-gray-200';
  }
};

const getMealTypeIcon = (type: Meal['type']): JSX.Element => {
  switch (type) {
    case 'breakfast':
      return <span className="text-xl">🌅</span>;
    case 'lunch':
      return <span className="text-xl">🍽️</span>;
    case 'dinner':
      return <span className="text-xl">🌙</span>;
    case 'snack':
      return <span className="text-xl">☕</span>;
    default:
      return <Clock className="w-5 h-5" />;
  }
};

const MealCard = ({ meal }: { meal: Meal }) => {
  return (
    <div className={`border rounded-xl p-4 overflow-hidden shadow-sm transition-all hover:shadow-md relative ${getMealTypeColor(meal.type)}`}>
      {meal.image && (
        <div className="w-full h-40 mb-3 -mt-4 -mx-4 w-[calc(100%+2rem)] border-b border-black/5 relative group">
          <img src={meal.image} alt={meal.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        </div>
      )}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3 flex-1">
          <div className={`shrink-0 ${meal.image ? '-mt-8 p-1.5 bg-white/90 backdrop-blur rounded-lg shadow-sm border border-white/50 z-10 relative' : ''}`}>
            {getMealTypeIcon(meal.type)}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 leading-tight">{meal.name}</p>
            {meal.description && (
              <p className="text-sm text-gray-600 mt-0.5">{meal.description}</p>
            )}
          </div>
        </div>
      </div>

      {(meal.isGlutenFree || meal.isVegetarian || meal.isVegan) && (
        <div className={`flex flex-wrap gap-2 mt-3 pt-3 border-t border-current border-opacity-20 ${meal.image ? 'relative z-10' : ''}`}>
          {meal.isVegetarian && (
            <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              <Leaf className="w-3 h-3" />
              Vegetariano
            </span>
          )}
          {meal.isVegan && (
            <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              <Flame className="w-3 h-3" />
              Vegano
            </span>
          )}
          {meal.isGlutenFree && (
            <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
              <span className="text-xs">🌾</span>
              Sin Gluten
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const DayMenuCard = ({ day }: { day: MenuDay }) => {
  const dayDate = new Date(day.date + 'T00:00:00');
  const dayName = dayDate.toLocaleDateString('es-ES', { weekday: 'long' });
  const formattedDate = dayDate.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
        <h3 className="text-lg font-semibold text-white capitalize">
          {dayName}
        </h3>
        <p className="text-sm text-green-50">{formattedDate}</p>
      </div>

      <div className="p-6 space-y-4">
        {day.meals && day.meals.length > 0 ? (
          day.meals.map((meal, index) => (
            <div key={meal.id || index}>
              <div className="mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {getMealTypeLabel(meal.type)}
                </span>
              </div>
              <MealCard meal={meal} />
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>No hay comidas registradas para este día</p>
          </div>
        )}
      </div>

    </div>
  );
};

export function ResidentMenuView({ onGoToProfile, onLogout }: ResidentMenuViewProps) {
  const [menuWeek, setMenuWeek] = useState<MenuWeek | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestText, setRequestText] = useState("");

  useEffect(() => {
    const loadMenu = async () => {
      try {
        setLoading(true);
        const week = await menuService.getCurrentWeek();
        setMenuWeek(week);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar el menú');
        setMenuWeek(null);
      } finally {
        setLoading(false);
      }
    };

    loadMenu();
  }, []);

  const handleSendRequest = () => {
    if (requestText.trim()) {
      menuService.createSpecialRequest({
        description: requestText,
        date: new Date().toISOString().split('T')[0]
      });

      toast.success("Petición enviada");
      setIsModalOpen(false);
      setRequestText("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-500">Cargando menú...</p>
        </div>
      </div>
    );
  }

  if (!menuWeek) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-serif text-gray-900 mb-2">
              Menú del Comedor
            </h1>
            <p className="text-gray-600">
              {error || 'No hay menú disponible para esta semana'}
            </p>
          </div>

          <div className="col-span-full text-center py-16 text-gray-400">
            <p className="text-lg">No hay menú disponible para esta semana</p>
            <p className="text-sm mt-2">El menú se actualizará cuando el personal lo publique</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full bg-[#F6F7F9]">
      {/* Header */}
      <header className="bg-primary p-6 pt-12 flex justify-between items-center shrink-0 shadow-lg sticky top-0 z-20">
        <h1 className="text-primary-foreground text-2xl font-bold">Menú</h1>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button
            className="text-primary-foreground hover:bg-primary-foreground/20 hover:scale-110 rounded-full transition-all"
            onClick={() => onGoToProfile?.()}
            aria-label="Ir al perfil"
          >
            <User className="w-5 h-5" />
          </Button>
          {onLogout ? (
            <Button
              className="text-primary-foreground hover:bg-primary-foreground/20 hover:scale-110 rounded-full transition-all"
              onClick={onLogout}
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          ) : null}
        </div>
      </header>
      
      <div className="min-h-screen bg-[#F6F7F9] pt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Menu Days Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuWeek.days && menuWeek.days.length > 0 ? (
            menuWeek.days.map((day, index) => (
              <DayMenuCard key={day.id || index} day={day} />
            ))
          ) : (
            <div className="col-span-full text-center py-16 text-gray-400">
              <p className="text-lg">No hay menú disponible para esta semana</p>
            </div>
          )}
        </div>

        {/* Dietary Info Footer */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-4">Información dietética</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-green-600" />
              <span>Las opciones vegetarianas disponibles están marcadas</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-600" />
              <span>Las opciones veganas están indicadas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🌾</span>
              <span>Las opciones sin gluten están identificadas</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    {/* Botón de Petición Especial */}
<div className="mt-4 pt-4 border-t border-gray-100">
  {/* Botón flotante corregido */}
<div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-xs px-4">
  <button
    onClick={() => setIsModalOpen(true)}
    className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 text-white rounded-full font-bold shadow-lg hover:bg-orange-600 transition-transform active:scale-95"
  >
    <MessageSquare size={20} />
    Petición especial
  </button>
</div>
  {isModalOpen && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Nueva petición especial</h3>
      
      <textarea
        className="w-full border border-gray-200 rounded-xl p-3 h-32 focus:ring-2 focus:ring-orange-500 outline-none resize-none"
        placeholder="Ej: Sin sal, alérgico a los frutos secos, etc..."
        value={requestText}
        onChange={(e) => setRequestText(e.target.value)}
      />

      <div className="flex gap-3 mt-6">
        <button
          onClick={() => setIsModalOpen(false)}
          className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSendRequest}
          disabled={!requestText.trim()}
          className="flex-1 py-2 bg-orange-500 text-white font-bold rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
        </button>
      </div>
    </div>
  </div>
)}
</div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Petición Especial</h3>
            <textarea
              className="w-full h-32 p-3 border border-gray-200 rounded-xl mb-4 focus:ring-2 focus:ring-amber-500 outline-none resize-none text-gray-700"
              placeholder="Describe tu necesidad (picnic, dieta médica...)"
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
            />
            <div className="flex gap-3">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="flex-1 rounded-xl border border-gray-300 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSendRequest} 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center justify-center gap-2 font-bold"
              >
                <Send size={16} /> Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
