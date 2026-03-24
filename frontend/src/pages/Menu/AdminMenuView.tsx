import { Clock, Edit2, Plus, Trash2, Leaf, Flame, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useCallback, JSX } from "react";
import { MenuWeek, MenuDay, Meal } from "../../types/menu.types";
import menuService from "../../services/menu.service";
import { Toast } from "../../components/ui/Toast";
import { ConfirmModal } from "../../components/ui/ConfirmModal";

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
            <p className="font-semibold text-gray-900">{meal.name}</p>
            {meal.description && (
              <p className="text-sm text-gray-500">{meal.description}</p>
            )}
          </div>
        </div>
        <div className={`flex gap-2 ml-4 shrink-0 ${meal.image ? '-mt-8 z-10 relative' : ''}`}>
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

      {(meal.isGlutenFree || meal.isVegetarian || meal.isVegan) && (
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
  dayId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (meal: Meal, dayId: string) => void;
  isSaving?: boolean;
}

const EditMealModal = ({ meal, isOpen, onClose, onSave, dayId, isSaving }: EditMealModalProps) => {
  const [formData, setFormData] = useState<Meal>(
    meal || { allergens: [], name: '', type: 'lunch', description: '', isGlutenFree: false, isVegetarian: false, isVegan: false }
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Reseteamos el form cuando se abre el modal con nuevos datos
  useEffect(() => {
    if (isOpen) {
      setFormData(
        meal || { allergens: [], name: '', type: 'lunch', description: '', isGlutenFree: false, isVegetarian: false, isVegan: false }
      );
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


          {/* Imagen URL */}
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
            {/* --- ESTE BLOQUE USA PREVIEWURL Y QUITA EL ERROR --- */}
            <div className="flex flex-col gap-4 py-4">
              <label className="text-sm font-medium">Imagen del plato</label>
              
              {/* Mostramos la foto si existe una previa o una ya guardada */}
              {(previewUrl || meal.image) && (
                <div className="relative w-full h-40 border rounded-md overflow-hidden bg-gray-100">
                  <img 
                    src={previewUrl || meal.image} 
                    alt="Previsualización" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPhotoFile(file);
                    // Aquí le damos valor a la variable
                    const url = URL.createObjectURL(file);
                    setPreviewUrl(url); 
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
                onSave(formData, dayId);
              }
            }}
            disabled={isSaving || !formData.name.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Semana a crear (Día de referencia)
            </label>
            <input
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
                onEdit={(m) => onEditMeal(m, day.id || '')}
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

export function AdminMenuView() {
  const [menuWeek, setMenuWeek] = useState<MenuWeek | null>(null);
  const [allWeeks, setAllWeeks] = useState<MenuWeek[]>([]);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewWeekModalOpen, setIsNewWeekModalOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | undefined>();
  const [editingDayId, setEditingDayId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [specialRequests, setSpecialRequests] = useState<any[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [, setPreviewUrl] = useState<string | null>(null);
  
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
        const requests = await menuService.getSpecialRequests();
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
            const firstWeek = await menuService.getWeek(weeks[0].id!);
            setMenuWeek(firstWeek);
            setSelectedWeekId(weeks[0].id || null);
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
    showToast('Error al actualizar la petición', 'error');
  }
};
  const handleAddMeal = (_dayDate: string, dayId: string) => {
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

  const handleSaveMeal = async (meal: Meal, dayId: string) => {
  setIsSaving(true);
  try {
    // Creamos el "sobre" para enviar datos + imagen
    const formData = new FormData();

    // Añadimos los campos de texto
    formData.append('name', meal.name);
    formData.append('description', meal.description || '');
    formData.append('type', meal.type);
    formData.append('isGlutenFree', String(meal.isGlutenFree));
    formData.append('isVegetarian', String(meal.isVegetarian));
    formData.append('isVegan', String(meal.isVegan));

    // Si el usuario seleccionó una foto nueva, la añadimos
    if (photoFile) {
      // Usamos 'image' para que coincida con el Serializer de Django
      formData.append('image', photoFile);
    }

    // Enviamos el formData al servicio que acabamos de actualizar
    if (meal.id) {
      await menuService.updateMeal(meal.id, formData);
    } else {
      await menuService.createMeal(dayId, formData);
    }

    // Limpieza tras éxito
    setIsEditModalOpen(false);
    setPhotoFile(null); 
    setPreviewUrl(null);
    
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
    if (!menuWeek?.id) return;

    confirmAction(
      'Eliminar semana completa',
      '¿Estás seguro de que quieres eliminar esta semana completa? Se borrarán todas las comidas y los días.',
      async () => {
        setIsSaving(true);
        try {
          await menuService.deleteWeek(menuWeek.id!);

          const updatedWeeks = allWeeks.filter(w => w.id !== menuWeek.id);
          setAllWeeks(updatedWeeks);

          if (updatedWeeks.length > 0) {
            await loadWeekDetail(updatedWeeks[0].id!);
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
            <button
              onClick={() => setIsNewWeekModalOpen(true)}
              className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Nueva Semana
            </button>
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
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-serif text-gray-900 mb-1">
              Gestión del Menú
            </h1>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-2xl shadow-sm border border-gray-100">
                <button
                  onClick={() => handleNavigateWeek('prev')}
                  disabled={!canGoPrev}
                  className="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight whitespace-nowrap">
                  {new Date(menuWeek.weekStart + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  {' - '}
                  {new Date(menuWeek.weekEnd + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </h2>
                <button
                  onClick={() => handleNavigateWeek('next')}
                  disabled={!canGoNext}
                  className="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              {/* Status indicator inline */}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white ${menuWeek.isPublished ? 'border-green-200 text-green-700 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 'border-orange-200 text-orange-700'}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${menuWeek.isPublished ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-orange-500'}`} />
                <span className="text-sm font-medium">{menuWeek.isPublished ? 'Publicado' : 'Borrador'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Toggle Publish */}
            <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm" title={menuWeek.isPublished ? 'Ocultar a residentes' : 'Publicar a residentes'}>
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">Público</span>
              <button
                onClick={handleTogglePublish}
                disabled={isSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 ${menuWeek.isPublished ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${menuWeek.isPublished ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="w-px h-8 bg-gray-200 hidden sm:block mx-1" />

            <button
              onClick={handleDeleteWeek}
              disabled={isSaving}
              className="p-2.5 text-red-600 bg-red-50/50 border border-red-100 rounded-xl hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50"
              title="Eliminar semana completa"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsNewWeekModalOpen(true)}
              disabled={isSaving}
              className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              Nueva Semana
            </button>
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
          <span className="bg-white/20 text-white text-xs px-2 py-1 rounded">{specialRequests.length}</span>
        </div>
        <div className="divide-y divide-gray-100">
          {specialRequests.length === 0 ? (
            <p className="p-8 text-center text-gray-400">No hay peticiones pendientes</p>
          ) : (
            specialRequests.map((req) => (
              <div key={req.id} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-bold text-gray-800">{req.resident_name || 'Residente'}</p>
                  <p className="text-sm text-gray-500">{req.date}: {req.description}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleUpdateSpecialRequest(req.id, 'approved')} 
                    className="bg-green-600 text-white px-3 py-1 rounded-lg text-sm font-bold"
                  >
                    Aprobar
                  </button>
                  <button 
                    onClick={() => handleUpdateSpecialRequest(req.id, 'rejected')} 
                    className="border border-red-200 text-red-600 px-3 py-1 rounded-lg text-sm font-bold"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
