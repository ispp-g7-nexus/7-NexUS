import { Clock, Edit2, Plus, Trash2, Leaf, Flame, X } from "lucide-react";
import { useState } from "react";
import { MenuWeek, MenuDay, Meal } from "../../types/menu.types";

interface AdminMenuViewProps {
  menuWeek?: MenuWeek;
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

interface MealCardAdminProps {
  meal: Meal;
  onEdit: (meal: Meal) => void;
  onDelete: (mealId?: string) => void;
}

const MealCardAdmin = ({ meal, onEdit, onDelete }: MealCardAdminProps) => {
  return (
    <div className={`border rounded-lg p-4 ${getMealTypeColor(meal.type)}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1">
          {getMealTypeIcon(meal.type)}
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{meal.name}</p>
            {meal.description && (
              <p className="text-sm text-gray-500">{meal.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => onEdit(meal)}
            className="p-1.5 hover:bg-blue-100 rounded-md text-blue-600 transition-colors"
            title="Editar comida"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(meal.id)}
            className="p-1.5 hover:bg-red-100 rounded-md text-red-600 transition-colors"
            title="Eliminar comida"
          >
            <Trash2 className="w-4 h-4" />
          </button>
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

interface MealTypeOption {
  value: Meal['type'];
  label: string;
}

const MEAL_TYPES: MealTypeOption[] = [
  { value: 'breakfast', label: 'Desayuno' },
  { value: 'lunch', label: 'Comida' },
  { value: 'dinner', label: 'Cena' },
  { value: 'snack', label: 'Merienda' },
];

interface EditMealModalProps {
  meal?: Meal;
  dayDate?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (meal: Meal) => void;
}

const EditMealModal = ({ meal, isOpen, onClose, onSave }: EditMealModalProps) => {
  const [formData, setFormData] = useState<Meal>(
    meal || { name: '', type: 'lunch', description: '', allergens: [], isVegetarian: false, isVegan: false }
  );

  if (!isOpen) return null;

  const handleChange = (field: keyof Meal, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {meal ? 'Editar comida' : 'Agregar comida'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-50 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Nombre de la comida
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Ej: Arroz con pollo"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Tipo de comida
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value as Meal['type'])}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MEAL_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Descripción (opcional)
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Ej: Acompañado de ensalada fresca"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Alérgenos */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Alérgenos (separados por comas)
            </label>
            <input
              type="text"
              value={formData.allergens?.join(', ') || ''}
              onChange={(e) => handleChange('allergens', e.target.value.split(',').map(a => a.trim()).filter(Boolean))}
              placeholder="Ej: Gluten, Maní, Leche"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Opciones dietéticas */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-500">
              Opciones dietéticas
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isVegetarian || false}
                  onChange={(e) => handleChange('isVegetarian', e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-500">Vegetariano</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isVegan || false}
                  onChange={(e) => handleChange('isVegan', e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-500">Vegano</span>
              </label>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-500 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onSave(formData);
              onClose();
            }}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

interface DayMenuCardAdminProps {
  day: MenuDay;
  onAddMeal: (dayDate: string) => void;
  onEditMeal: (meal: Meal) => void;
  onDeleteMeal: (mealId?: string) => void;
}

const DayMenuCardAdmin = ({ day, onAddMeal, onEditMeal, onDeleteMeal }: DayMenuCardAdminProps) => {
  const dayDate = new Date(day.date);
  const dayName = dayDate.toLocaleDateString('es-ES', { weekday: 'long' });
  const formattedDate = dayDate.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="bg-primary px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white capitalize">
            {dayName}
          </h3>
          <p className="text-sm text-primary-foreground/80">{formattedDate}</p>
        </div>
        <button
          onClick={() => onAddMeal(day.date)}
          className="flex items-center gap-2 px-3 py-2 bg-white text-primary rounded-lg hover:bg-primary/10 transition-colors font-medium"
          title="Agregar comida"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Agregar</span>
        </button>
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
              <MealCardAdmin
                meal={meal}
                onEdit={onEditMeal}
                onDelete={onDeleteMeal}
              />
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>No hay comidas registradas para este día</p>
            <p className="text-sm mt-2">Usa el botón "Agregar" para crear una</p>
          </div>
        )}
      </div>
    </div>
  );
};

export function AdminMenuView({ menuWeek }: AdminMenuViewProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | undefined>();
  const [editingDayDate, setEditingDayDate] = useState<string>('');

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

  const handleAddMeal = (dayDate: string) => {
    setEditingDayDate(dayDate);
    setSelectedMeal(undefined);
    setIsEditModalOpen(true);
  };

  const handleEditMeal = (meal: Meal) => {
    setSelectedMeal(meal);
    setIsEditModalOpen(true);
  };

  const handleDeleteMeal = (mealId?: string) => {
    // Esta función solo es visual, la lógica se implementará después
    console.log('Eliminar comida:', mealId);
    alert('Eliminar comida: ' + (mealId || 'Nueva comida'));
  };

  const handleSaveMeal = (meal: Meal) => {
    // Esta función solo es visual, la lógica se implementará después
    console.log('Guardar comida:', meal);
    alert('Comida guardada: ' + meal.name);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-serif text-gray-900 mb-2">
              Gestión del Menú del Comedor
            </h1>
            <p className="text-gray-500">
              Administra el menú de la semana del{' '}
              {new Date(week.weekStart).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
              })}{' '}
              al{' '}
              {new Date(week.weekEnd).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
          <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Nueva Semana
          </button>
        </div>

        {/* Menu Days Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {week.days && week.days.length > 0 ? (
            week.days.map((day, index) => (
              <DayMenuCardAdmin
                key={day.id || index}
                day={day}
                onAddMeal={handleAddMeal}
                onEditMeal={handleEditMeal}
                onDeleteMeal={handleDeleteMeal}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-16 text-gray-400">
              <p className="text-lg">No hay menú disponible para esta semana</p>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-4">Consejos de administración</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <p className="font-medium mb-1">✓ Comidas por tipo</p>
              <p>Organiza las comidas por tipos: Desayuno, Comida, Cena y Merienda</p>
            </div>
            <div>
              <p className="font-medium mb-1">✓ Información dietética</p>
              <p>Marca claramente los platos vegetarianos, veganos y alérgenos</p>
            </div>
            <div>
              <p className="font-medium mb-1">✓ Ediciones rápidas</p>
              <p>Haz clic en el icono de edición para modificar cualquier comida</p>
            </div>
            <div>
              <p className="font-medium mb-1">✓ Gestión semanal</p>
              <p>Planifica y gestiona el menú por semanas completas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Meal Modal */}
      <EditMealModal
        meal={selectedMeal}
        dayDate={editingDayDate}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveMeal}
      />
    </div>
  );
}
