import { Clock, Flame, Leaf, LogOut, User } from "lucide-react";
import { MenuWeek, MenuDay, Meal } from "../../types/menu.types";
import { NotificationBell } from "../../components/announcement/NotificationBell";
import { Button } from "../../components/ui/button";

interface ResidentMenuViewProps {
  menuWeek?: MenuWeek;
  onGoToProfile?: () => void;
  onLogout?: () => void;
}

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
    <div className={`border rounded-lg p-4 ${getMealTypeColor(meal.type)}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {getMealTypeIcon(meal.type)}
          <div>
            <p className="font-semibold text-gray-900">{meal.name}</p>
            {meal.description && (
              <p className="text-sm text-gray-500">{meal.description}</p>
            )}
          </div>
        </div>
      </div>

      {(meal.allergens || meal.isVegetarian || meal.isVegan) && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-current border-opacity-20">
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
          {meal.allergens && meal.allergens.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
              ⚠️ Alérgenos: {meal.allergens.join(', ')}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const DayMenuCard = ({ day }: { day: MenuDay }) => {
  const dayDate = new Date(day.date);
  const dayName = dayDate.toLocaleDateString('es-ES', { weekday: 'long' });
  const formattedDate = dayDate.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="bg-primary pt-12 pb-24 px-6 rounded-b-[2.5rem] relative">
        <h3 className="text-lg font-semibold text-primary-foreground capitalize">
          {dayName}
        </h3>
        <p className="text-sm text-primary-foreground/80">{formattedDate}</p>
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

export function ResidentMenuView({ menuWeek, onGoToProfile, onLogout }: ResidentMenuViewProps) {
  const mockMenuWeek: MenuWeek = menuWeek || {
    weekStart: '2026-03-09',
    weekEnd: '2026-03-15',
    days: [
      {
        day: 'lunes',
        date: '2026-03-09',
        meals: [
          {
            name: 'Café con tostadas',
            type: 'breakfast',
            isVegetarian: true,
          },
          {
            name: 'Arroz con pollo',
            description: 'Acompañado de ensalada fresca',
            type: 'lunch',
          },
          {
            name: 'Sopa de verduras',
            type: 'dinner',
            isVegetarian: true,
            isVegan: true,
          },
        ],
      },
      {
        day: 'martes',
        date: '2026-03-10',
        meals: [
          {
            name: 'Zumo de naranja y cereales',
            type: 'breakfast',
            isVegetarian: true,
            isVegan: true,
          },
          {
            name: 'Pasta a la boloñesa',
            type: 'lunch',
            allergens: ['Gluten', 'Huevo'],
          },
          {
            name: 'Hamburguesas caseras',
            type: 'dinner',
          },
        ],
      },
      {
        day: 'miércoles',
        date: '2026-03-11',
        meals: [
          {
            name: 'Tostadas con mermelada',
            type: 'breakfast',
            isVegetarian: true,
          },
          {
            name: 'Caldereta de res',
            type: 'lunch',
          },
          {
            name: 'Pizza Margarita',
            type: 'dinner',
            isVegetarian: true,
          },
        ],
      },
      {
        day: 'jueves',
        date: '2026-03-12',
        meals: [
          {
            name: 'Yogur con granola',
            type: 'breakfast',
            isVegetarian: true,
          },
          {
            name: 'Cuscús con verduras',
            type: 'lunch',
            isVegetarian: true,
            isVegan: true,
          },
          {
            name: 'Pollo al horno con papas',
            type: 'dinner',
          },
        ],
      },
      {
        day: 'viernes',
        date: '2026-03-13',
        meals: [
          {
            name: 'Desayuno completo',
            description: 'Huevos, jamón, pan',
            type: 'breakfast',
          },
          {
            name: 'Paella de mariscos',
            type: 'lunch',
          },
          {
            name: 'Filete de pescado',
            type: 'dinner',
          },
        ],
      },
    ],
  };

  const week = menuWeek || mockMenuWeek;

  return (
    <div className="flex flex-col w-full bg-background">
      {/* Header */}
      <header className="bg-primary p-6 pt-12 flex justify-between items-center shrink-0 shadow-lg sticky top-0 z-20">
        <h1 className="text-primary-foreground text-2xl font-bold">Menú</h1>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button
            size="icon"
            variant="ghost"
            className="text-primary-foreground hover:bg-primary-foreground/20 hover:scale-110 rounded-full transition-all"
            onClick={() => onGoToProfile?.()}
            aria-label="Ir al perfil"
          >
            <User className="w-5 h-5" />
          </Button>
          {onLogout ? (
            <Button
              size="icon"
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/20 hover:scale-110 rounded-full transition-all"
              onClick={onLogout}
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          ) : null}
        </div>
      </header>
      
      <div className="min-h-screen bg-background pt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Menu Days Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {week.days && week.days.length > 0 ? (
            week.days.map((day, index) => (
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
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Leaf className="w-5 h-5 text-primary" />
              </div>
              <span>Las opciones vegetarianas disponibles están marcadas</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-600" />
              <span>Las opciones veganas están indicadas</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <span>Los alérgenos comunes están listados</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
