import { Clock, Edit2, Plus, Trash2, Leaf, Flame, X, Loader2, ChevronLeft, FileUp } from "lucide-react";
import { useState, useEffect, useCallback, JSX, SyntheticEvent } from "react";
import { MenuWeek, MenuDay, Meal } from "../../types/menu.types";
import menuService from "../../services/menu.service";
import { Toast } from "../../components/ui/Toast";
import { ConfirmModal } from "../../components/ui/ConfirmModal";


const getMealTypeLabel = (type: Meal['type']): string => {
  switch (type) {
    case 'breakfast': return 'Desayuno';
    case 'lunch': return 'Comida';
    case 'snack': return 'Merienda';
    case 'dinner': return 'Cena';
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

function getPlaceholderImage(): string {
  // SVG placeholder local para evitar depender de conexión externa
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f0f0f0" width="200" height="200"/%3E%3Ctext x="50%" y="50%" font-size="14" fill="%23999" text-anchor="middle" dy=".3em"%3E Imagen no disponible%3C/text%3E%3C/svg%3E';
}
  
const MealCardAdmin = ({ meal, onEdit, onDelete }: MealCardAdminProps) => {
  return (
      <div className={`border rounded-xl p-4 overflow-hidden shadow-sm transition-all hover:shadow-md relative ${getMealTypeColor(meal.type)}`}>
  {meal?.image && (
    <div className="w-full h-40 mb-3 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden relative group">
            <img
              src={meal.image || getPlaceholderImage()}
              alt={meal.name}
              className="w-full h-full object-contain p-1"
              onError={(e: SyntheticEvent<HTMLImageElement>) => {
                e.currentTarget.src = getPlaceholderImage();
              }}
            />
    </div>
  )}
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col items-center gap-3 mt-2 flex-1">
          {!meal.image && (
            <div className="shrink-0">
              {getMealTypeIcon(meal.type)}
            </div>
          )}
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{meal.name}</p>
            {meal.description && (
              <p className="text-sm text-gray-500">{meal.description}</p>
            )}
          </div>
          {meal.allergens && meal.allergens.trim() !== '' && (
          <div className="mt-2 flex items-start gap-1 text-sm text-orange-600 bg-orange-50 p-2 rounded-md">
            <span title="Alérgenos">⚠️</span>
            <p>
              <span className="font-semibold">Alérgenos: </span>
              {meal.allergens}
            </p>
          </div>
        )}
        </div>
        
        <div className={`flex gap-2 ml-4 shrink-0 ${meal.image ? ' z-10 relative' : ''}`}>
          <button
            onClick={() => onEdit(meal)}
            className="p-1.5 hover:bg-green-100 rounded-md text-green-600 transition-colors"
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

      {(meal.isGlutenFree || meal.isVegetarian || meal.isVegan) && (
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-current border-opacity-20">
          {meal.isVegetarian && (
            <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              <Leaf className="w-3 h-3" />
              <span className="ml-1">Vegetariano</span>
            </span>
          )}
          {meal.isVegan && (
            <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              <Flame className="w-3 h-3" />
              <span className="ml-1">Vegano</span>
            </span>
          )}
          {meal.isGlutenFree && (
            <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
              <span className="text-xs">🌾</span>
              <span className="ml-1">Sin Gluten</span>
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
  { value: 'snack', label: 'Merienda' },
  { value: 'dinner', label: 'Cena' },
];

interface EditMealModalProps {
  meal?: Meal;
  dayDate?: string;
  dayId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (meal: Meal, dayId: string, photoFile: File | null, imageToDelete?: boolean) => void;
  isSaving?: boolean;
}

const EditMealModal = ({ meal, isOpen, onClose, onSave, dayId, isSaving }: EditMealModalProps) => {
  const [formData, setFormData] = useState<Meal>(() =>
  meal
    ? {
        ...meal,
        allergens: Array.isArray(meal.allergens) 
        ? meal.allergens.join(', ') 
        : (meal.allergens || ''),
      }
    : { allergens: '', name: '', type: 'lunch', description: '', isGlutenFree: false, isVegetarian: false, isVegan: false }
);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageToDelete, setImageToDelete] = useState(false);
  useEffect(() => {
    if (isOpen) {
      setFormData(
      meal
        ? {
            ...meal,
            allergens: Array.isArray(meal.allergens) 
        ? meal.allergens.join(', ') 
        : (meal.allergens || ''),
          }
        : { allergens: '', name: '', type: 'lunch', description: '', isGlutenFree: false, isVegetarian: false, isVegan: false }
    );
      setImageToDelete(false);
      setPhotoFile(null);
      setPreviewUrl(null);
    }
  }, [isOpen, meal]);

  useEffect(() => {
    if (!photoFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(photoFile);
    setPreviewUrl(objectUrl);


    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [photoFile]);

  if (!isOpen) return null;

  const handleChange = (field: keyof Meal, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPreviewUrl(null);
    setImageToDelete(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 max-h-[90vh] flex flex-col">
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

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Nombre de la comida *
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
              Tipo de comida *
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
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


          {/* Imagen */}
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              Alérgenos (separados por comas)
            </label>
            <input
              type="text"
              value={formData.allergens || ''}
              onChange={(e) => handleChange('allergens', e.target.value)}
              placeholder="Ej: Gluten, Maní, Leche"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex flex-col gap-4 py-4">
              <label htmlFor="meal-image-input" className="text-sm font-medium">Imagen del plato</label>

              {(previewUrl || (meal?.image && !imageToDelete)) && (
                <div className="relative w-full h-40 border rounded-md overflow-hidden bg-gray-100">
                  <img
                    src={previewUrl || meal?.image}
                    alt="Previsualización"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <input
                id="meal-image-input"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPhotoFile(file);
                    const url = URL.createObjectURL(file);
                    setPreviewUrl(url);
                    setImageToDelete(false);
                  }
                }}
                className="cursor-pointer"
              />
            </div>
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
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isGlutenFree || false}
                  onChange={(e) => handleChange('isGlutenFree', e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-700">Sin Gluten</span>
              </label>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-500 font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (dayId) {
                onSave(formData, dayId, photoFile, imageToDelete);
              }
            }}
            disabled={isSaving || !formData.name.trim()}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

interface NewWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (weekStart: string, weekEnd: string) => void;
  isSaving?: boolean;
}

const NewWeekModal = ({ isOpen, onClose, onSave, isSaving }: NewWeekModalProps) => {
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      setSelectedDate(today.toISOString().split('T')[0]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-lg max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">
            Crear nueva semana
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500 leading-relaxed">
            Selecciona <strong>cualquier día de la semana</strong> que desees crear. El sistema construirá automáticamente la semana empezando desde el lunes.
          </p>
          <div>
            <label htmlFor="new-week-date" className="block text-sm font-medium text-gray-700 mb-2">
              Semana a crear (Día de referencia)
            </label>
            <input
              id="new-week-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-white transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(selectedDate, selectedDate)}
            disabled={isSaving || !selectedDate}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Crear semana
          </button>
        </div>
      </div>
    </div>
  );
};

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (weekStart: string, file: File) => void;
  isSaving?: boolean;
}

const ImportCsvModal = ({ isOpen, onClose, onSave, isSaving }: ImportCsvModalProps) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      setSelectedDate(today.toISOString().split('T')[0]);
      setFile(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-lg max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">
            Importar Menú por CSV
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500 leading-relaxed">
            Sube un archivo CSV con el formato adecuado. Selecciona una fecha de inicio para la semana.
          </p>
          <div>
            <label htmlFor="csv-week-date" className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de inicio
            </label>
            <input
              id="csv-week-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
            />
          </div>
          <div>
             <label htmlFor="csv-file" className="block text-sm font-medium text-gray-700 mb-2">
              Archivo CSV
             </label>
             <input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
             />
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-white transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
               if (selectedDate && file) {
                  onSave(selectedDate, file);
               }
            }}
            disabled={isSaving || !selectedDate || !file}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Importar
          </button>
        </div>
      </div>
    </div>
  );
};

interface DayMenuCardAdminProps {
  day: MenuDay;
  onAddMeal: (dayDate: string, dayId: string) => void;
  onEditMeal: (meal: Meal, dayId: string) => void;
  onDeleteMeal: (mealId?: string) => void;
}

const DayMenuCardAdmin = ({ day, onAddMeal, onEditMeal, onDeleteMeal }: DayMenuCardAdminProps) => {
  const dayDate = new Date(day.date + 'T00:00:00');
  const dayName = dayDate.toLocaleDateString('es-ES', { weekday: 'long' });
  const formattedDate = dayDate.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
  });

  const MEAL_TYPE_ORDER: Meal['type'][] = ['breakfast', 'lunch', 'snack', 'dinner'];

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
          onClick={() => onAddMeal(day.date, day.id || '')}
          className="flex items-center gap-2 px-3 py-2 bg-white text-primary rounded-lg hover:bg-gray-100 hover:shadow-lg scale-100 hover:scale-105 transition-all font-medium"
          title="Agregar comida"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Agregar</span>
        </button>
      </div>

      <div className="p-6 space-y-6">
        {day.meals && day.meals.length > 0 ? (
          MEAL_TYPE_ORDER.map(type => {
            const mealsOfType = day.meals?.filter(m => m.type === type) || [];
            if (mealsOfType.length === 0) return null;

            return (
              <div key={type} className="space-y-3">
                <div className="mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {getMealTypeLabel(type)}
                  </span>
                </div>
                <div className="space-y-4">
                  {mealsOfType.map((meal, index) => (
                    <MealCardAdmin
                      key={meal.id || index}
                      meal={meal}
                      onEdit={(m) => onEditMeal(m, day.id || '')}
                      onDelete={onDeleteMeal}
                    />
                  ))}
                </div>
              </div>
            );
          })
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

export function AdminMenuView() {
  const [menuWeek, setMenuWeek] = useState<MenuWeek | null>(null);
  const [allWeeks, setAllWeeks] = useState<MenuWeek[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewWeekModalOpen, setIsNewWeekModalOpen] = useState(false);
  const [isImportCsvModalOpen, setIsImportCsvModalOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | undefined>();
  const [editingDayId, setEditingDayId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [specialRequests, setSpecialRequests] = useState<any[]>([]);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({ isOpen: false, title: '', message: '', action: () => { } });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => setToast({ message, type });

  const confirmAction = (title: string, message: string, action: () => void) => {
    setConfirmConfig({ isOpen: true, title, message, action });
  };

  const loadWeeks = useCallback(async () => {
    try {
      const weeks = await menuService.listWeeks();
      setAllWeeks(weeks);
      return weeks;
    } catch {
      return [];
    }
  }, []);

  const loadWeekDetail = useCallback(async (weekId: string) => {
    try {
      setLoading(true);
      setError(null);
      const week = await menuService.getWeek(weekId);
      setMenuWeek(week);
      setSelectedWeekId(weekId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el menú');
      setMenuWeek(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      
      try {
        const requests = await menuService.listSpecialRequests();
        setSpecialRequests(requests);
      } catch (err) {
        console.error("Error al cargar solicitudes:", err);
      }

      try {
        const currentWeek = await menuService.getCurrentWeek();
        setMenuWeek(currentWeek);
        setSelectedWeekId(currentWeek.id || null);
        setError(null);
      } catch {
        try {
          const weeks = await menuService.listWeeks();
          setAllWeeks(weeks);
          if (weeks.length > 0) {
            const first = weeks[0];
            if (first.id) {
              const firstWeek = await menuService.getWeek(first.id);
              setMenuWeek(firstWeek);
              setSelectedWeekId(first.id || null);
            }
          } else {
            setMenuWeek(null);
          }
        } catch {
          setMenuWeek(null);
        }
      } finally {
        setLoading(false);
      }
      await loadWeeks();
    };
    init();
  }, [loadWeeks]);

    const handleUpdateSpecialRequest = async (id: string | number, status: 'approved' | 'rejected') => {
      try {
      await menuService.updateSpecialRequestStatus(id, status);
      
      setSpecialRequests(prev => prev.filter(req => req.id !== id));
      
      showToast(`Petición ${status === 'approved' ? 'aprobada' : 'rechazada'}`, 'success');
      } catch (err) {
        showToast('Error al actualizar la petición: ' + (err instanceof Error ? err.message : 'Error desconocido'), 'error');
      }
  };
  const handleAddMeal = (
     _dayDate: string
  , dayId: string) => {
     setEditingDayId(dayId);
     setSelectedMeal(undefined);
     setIsEditModalOpen(true);
  };

  const handleEditMeal = (meal: Meal, dayId: string) => {
    setSelectedMeal(meal);
    setEditingDayId(dayId);
    setIsEditModalOpen(true);
  };

  const handleDeleteMeal = async (mealId?: string) => {
    if (!mealId) return;

    confirmAction(
      'Eliminar comida',
      '¿Estás seguro de que quieres eliminar esta comida?',
      async () => {
        try {
          await menuService.deleteMeal(mealId);
          if (selectedWeekId) {
            await loadWeekDetail(selectedWeekId);
          }
          showToast('Comida eliminada correctamente', 'success');
        } catch (err) {
          showToast('Error al eliminar: ' + (err instanceof Error ? err.message : 'Error desconocido'), 'error');
        } finally {
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    );
  };

  const handleSaveMeal = async (meal: Meal, dayId: string, photo: File | null, shouldDeleteImage?: boolean) => {
  setIsSaving(true);
  try {
    const formData = new FormData();

    formData.append('name', meal.name);
    formData.append('description', meal.description || '');
    formData.append('type', meal.type);
    formData.append('allergens', Array.isArray(meal.allergens) ? meal.allergens.join(',') : (meal.allergens || ''));
    formData.append('isGlutenFree', String(meal.isGlutenFree));
    formData.append('isVegetarian', String(meal.isVegetarian));
    formData.append('isVegan', String(meal.isVegan));

    if (shouldDeleteImage) {
      formData.append('removeImage', 'true');
    }

    if (photo) {
      formData.append('image', photo);
    }

    if (meal.id) {
      await menuService.updateMeal(meal.id, formData);
    } else {
      await menuService.createMeal(dayId, formData);
    }

    setIsEditModalOpen(false);

    showToast(meal.id ? 'Comida actualizada' : 'Comida agregada', 'success');

    if (selectedWeekId) {
      await loadWeekDetail(selectedWeekId);
    }
  } catch (err) {
    showToast('Error al guardar: ' + (err instanceof Error ? err.message : 'Error desconocido'), 'error');
  } finally {
    setIsSaving(false);
  }
};

  const handleCreateWeek = async (weekStart: string, weekEnd: string) => {
    setIsSaving(true);
    try {
      const newWeek = await menuService.createWeek(weekStart, weekEnd);
      setIsNewWeekModalOpen(false);
      setMenuWeek(newWeek);
      setSelectedWeekId(newWeek.id || null);
      showToast('Semana creada correctamente', 'success');
      await loadWeeks();
    } catch (err) {
      showToast('Error al crear semana: ' + (err instanceof Error ? err.message : 'Error desconocido'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportCsv = async (weekStart: string, file: File) => {
    setIsSaving(true);
    try {
      const newWeek = await menuService.importWeekFromCsv(weekStart, file);
      setIsImportCsvModalOpen(false);
      setMenuWeek(newWeek);
      setSelectedWeekId(newWeek.id || null);
      showToast('Menú importado correctamente', 'success');
      await loadWeeks();
    } catch (err) {
      showToast('Error al importar menú: ' + (err instanceof Error ? err.message : 'Error desconocido'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNavigateWeek = async (direction: 'prev' | 'next') => {
    if (!selectedWeekId || allWeeks.length === 0) return;

    const currentIndex = allWeeks.findIndex(w => w.id === selectedWeekId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'prev' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= allWeeks.length) return;

    const targetWeek = allWeeks[newIndex];
    if (targetWeek.id) {
      await loadWeekDetail(targetWeek.id);
    }
  };

  const handleTogglePublish = async () => {
    if (!menuWeek?.id) return;
    setIsSaving(true);
    try {
      const updated = await menuService.updateWeek(menuWeek.id, {
        isPublished: !menuWeek.isPublished
      });
      setMenuWeek(updated);
      showToast(updated.isPublished ? 'Menú publicado' : 'Menú oculto a residentes', 'success');
      await loadWeeks();
    } catch (err) {
      showToast('Error al actualizar estado: ' + (err instanceof Error ? err.message : 'Error desconocido'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWeek = async () => {
    const weekId = menuWeek?.id;
    if (!weekId) return;

    confirmAction(
      'Eliminar semana completa',
      '¿Estás seguro de que quieres eliminar esta semana completa? Se borrarán todas las comidas y los días.',
      async () => {
        setIsSaving(true);
        try {
          await menuService.deleteWeek(weekId);

          const updatedWeeks = allWeeks.filter(w => w.id !== weekId);
          setAllWeeks(updatedWeeks);

          if (updatedWeeks.length > 0) {
            await loadWeekDetail(updatedWeeks[0].id);
          } else {
            setMenuWeek(null);
            setSelectedWeekId(null);
          }
          showToast('Semana eliminada correctamente', 'success');
        } catch (err) {
          showToast('Error al eliminar semana: ' + (err instanceof Error ? err.message : 'Error desconocido'), 'error');
        } finally {
          setIsSaving(false);
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    );
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
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-serif text-gray-900 mb-2">
                Gestión del Menú
              </h1>
              <p className="text-gray-600">
                {error || 'No hay menús semanales creados aún'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsImportCsvModalOpen(true)}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 shadow-sm"
              >
                <FileUp className="w-5 h-5" />
                Importar CSV
              </button>
              <button
                onClick={() => setIsNewWeekModalOpen(true)}
                className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium flex items-center gap-2 shadow-sm"
              >
                <Plus className="w-5 h-5" />
                Nueva Semana
              </button>
            </div>
          </div>

          <div className="col-span-full text-center py-16 text-gray-400">
            <p className="text-lg mb-4">No hay menú disponible</p>
            <p className="text-sm">Usa el botón "Nueva Semana" para crear el primer menú</p>
          </div>
        </div>

        <NewWeekModal
          isOpen={isNewWeekModalOpen}
          onClose={() => setIsNewWeekModalOpen(false)}
          onSave={handleCreateWeek}
          isSaving={isSaving}
        />

        <ImportCsvModal
          isOpen={isImportCsvModalOpen}
          onClose={() => setIsImportCsvModalOpen(false)}
          onSave={handleImportCsv}
          isSaving={isSaving}
        />

        <ConfirmModal
          isOpen={confirmConfig.isOpen}
          title={confirmConfig.title}
          message={confirmConfig.message}
          onConfirm={confirmConfig.action}
          onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        />

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    );
  }

  const currentIndex = allWeeks.findIndex(w => w.id === selectedWeekId);
  const canGoPrev = currentIndex < allWeeks.length - 1;
  const canGoNext = currentIndex > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-6">
          <h1 className="text-4xl font-serif text-gray-900 text-center">
            Gestión del Menú
          </h1>

          <div className="flex items-center justify-center gap-6">
            {/* Week Navigation */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleNavigateWeek('prev')}
                disabled={!canGoPrev}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-lg font-semibold text-gray-900 whitespace-nowrap min-w-[120px] text-center">
                {new Date(menuWeek.weekStart + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                {' - '}
                {new Date(menuWeek.weekEnd + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </span>
              <button
                onClick={() => handleNavigateWeek('next')}
                disabled={!canGoNext}
                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5 rotate-180" />
              </button>
            </div>

            {/* Status Badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
              menuWeek.isPublished
                ? 'bg-green-100 text-green-700'
                : 'bg-orange-100 text-orange-700'
            }`}>
              <div className={`w-2 h-2 rounded-full ${menuWeek.isPublished ? 'bg-green-500' : 'bg-orange-500'}`} />
              {menuWeek.isPublished ? 'Publicado' : 'Borrador'}
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
                <span className="text-sm text-gray-600">Público</span>
                <button
                  onClick={handleTogglePublish}
                  disabled={isSaving}
                  className={`w-8 h-5 rounded-full transition-colors ${
                    menuWeek.isPublished ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      menuWeek.isPublished ? 'translate-x-3.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <button
                onClick={handleDeleteWeek}
                disabled={isSaving}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>

              <button
                onClick={() => setIsImportCsvModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
              >
                <FileUp className="w-4 h-4" />
                Importar CSV
              </button>
              <button
                onClick={() => setIsNewWeekModalOpen(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nueva Semana
              </button>
            </div>
          </div>
        </div>

        {/* Menu Days Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuWeek.days && menuWeek.days.length > 0 ? (
            menuWeek.days.map((day, index) => (
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
              <p>Organiza las comidas por tipos: Desayuno, Comida, Merienda y Cena </p>
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
        dayId={editingDayId}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveMeal}
        isSaving={isSaving}
      />

      {/* New Week Modal */}
      <NewWeekModal
        isOpen={isNewWeekModalOpen}
        onClose={() => setIsNewWeekModalOpen(false)}
        onSave={handleCreateWeek}
        isSaving={isSaving}
      />

      {/* Import CSV Modal */}
      <ImportCsvModal
        isOpen={isImportCsvModalOpen}
        onClose={() => setIsImportCsvModalOpen(false)}
        onSave={handleImportCsv}
        isSaving={isSaving}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.action}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {/* Sección de Peticiones al final de la página */}
      <div className="mt-12 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-[#1B4D1C] p-4 flex justify-between items-center">
          <h3 className="text-white font-bold">Solicitudes Especiales</h3>
          <span className="bg-white/20 text-white text-xs px-2 py-1 rounded">{specialRequests.filter(r => r.status === 'pending').length}</span>
        </div>
        <div className="divide-y divide-gray-100">
          {specialRequests.length === 0 ? (
            <p className="p-8 text-center text-gray-400">No hay peticiones</p>
          ) : (
            <>
              {/* Peticiones Pendientes */}
              {specialRequests.filter(r => r.status === 'pending').map((req) => (
                <div key={req.id} className="p-4 flex justify-between items-center bg-orange-50/50 hover:bg-orange-50 transition-colors">
                  <div>
                    <p className="font-bold text-gray-800">{req.user_name || 'Usuario'}</p>
                    <p className="text-sm text-gray-500">{req.date}: {req.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleUpdateSpecialRequest(req.id, 'approved')} 
                      className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors"
                    >
                      Aprobar
                    </button>
                    <button 
                      onClick={() => handleUpdateSpecialRequest(req.id, 'rejected')} 
                      className="border border-red-200 text-red-600 px-3 py-1 rounded-lg text-sm font-bold hover:bg-red-50 transition-colors"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
              
              {/* Historial (Aprobadas/Rechazadas) */}
              {specialRequests.filter(r => r.status !== 'pending').length > 0 && (
                <>
                  <div className="px-4 py-3 bg-gray-50 border-t border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Historial</p>
                  </div>
                  {specialRequests.filter(r => r.status !== 'pending').map((req) => (
                    <div 
                      key={req.id} 
                      className={`p-4 flex justify-between items-center ${
                        req.status === 'approved' 
                          ? 'bg-green-50/30 hover:bg-green-50/50' 
                          : 'bg-red-50/30 hover:bg-red-50/50'
                      } transition-colors`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-800">{req.user_name || 'Usuario'}</p>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            req.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {req.status === 'approved' ? 'Aprobada' : 'Rechazada'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{req.date}: {req.description}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
