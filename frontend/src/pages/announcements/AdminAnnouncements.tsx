import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Plus } from "lucide-react";
import { Button } from "../../components/ui/button";
import { AnnouncementCard } from "../../components/announcement/AnnouncementCard";
import { AnnouncementFilters } from "../../components/announcement/AnnouncementFilters";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import { toast } from "sonner";
import announcementService from "../../services/announcement.service";
import type { AnnouncementList, AnnouncementCategory } from "../../types/announcement.types";

const CATEGORY_OPTIONS: { value: AnnouncementCategory; label: string }[] = [
  { value: "URGENT", label: "Urgente" },
  { value: "MAINTENANCE", label: "Mantenimiento" },
  { value: "EVENT", label: "Evento" },
  { value: "GENERAL", label: "General" },
];

const ANNOUNCEMENTS_POLL_MS = 2000;
const TITLE_MAX_LENGTH = 50;
const DESCRIPTION_MAX_LENGTH = 255;

const EMPTY_ANNOUNCEMENT_FORM = {
  title: "",
  description: "",
  category: "GENERAL" as AnnouncementCategory,
  announcement_date: "",
  featured: false,
};

function getLocalDateString(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type AnnouncementFormErrors = Partial<Record<"title" | "description" | "announcement_date", string>>;

export function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<AnnouncementList[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [error, setError] = useState<string | null>(null);
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementList | null>(null);
  const [deletingAnnouncement, setDeletingAnnouncement] = useState<AnnouncementList | null>(null);
  
  const [newAnnouncement, setNewAnnouncement] = useState(EMPTY_ANNOUNCEMENT_FORM);
  const [createErrors, setCreateErrors] = useState<AnnouncementFormErrors>({});
  const [editErrors, setEditErrors] = useState<AnnouncementFormErrors>({});

  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    thisMonth: 0,
  });

  const todayDate = getLocalDateString();

  const validateForm = (data: typeof EMPTY_ANNOUNCEMENT_FORM) => {
    const errors: AnnouncementFormErrors = {};
    if (!data.title.trim()) errors.title = "El título es obligatorio.";
    else if (data.title.length > TITLE_MAX_LENGTH) errors.title = `Máximo ${TITLE_MAX_LENGTH} caracteres.`;

    if (!data.description.trim()) errors.description = "La descripción es obligatoria.";
    else if (data.description.length > DESCRIPTION_MAX_LENGTH) errors.description = `Máximo ${DESCRIPTION_MAX_LENGTH} caracteres.`;

    if (!data.announcement_date) errors.announcement_date = "La fecha es obligatoria.";
    else if (data.announcement_date < todayDate) errors.announcement_date = "La fecha no puede estar en pasado.";

    return errors;
  };

  const validateField = (field: 'title' | 'description' | 'announcement_date', value: string, isCreate: boolean) => {
    let error = '';
    if (field === 'title') {
      if (value.length > TITLE_MAX_LENGTH) error = `Máximo ${TITLE_MAX_LENGTH} caracteres.`;
    } else if (field === 'description') {
      if (value.length > DESCRIPTION_MAX_LENGTH) error = `Máximo ${DESCRIPTION_MAX_LENGTH} caracteres.`;
    } else if (field === 'announcement_date') {
      if (value.trim() === '') error = "La fecha es obligatoria.";
      else if (value < todayDate) error = "La fecha no puede estar en pasado.";
    }

    if (isCreate) {
      setCreateErrors(prev => ({ ...prev, [field]: error }));
    } else {
      setEditErrors(prev => ({ ...prev, [field]: error }));
    }
  };

  const canCreate = Object.keys(validateForm(newAnnouncement)).length === 0;
  const canSave = editingAnnouncement ? Object.keys(validateForm(editingAnnouncement as typeof EMPTY_ANNOUNCEMENT_FORM)).length === 0 : false;

  const loadAnnouncements = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await announcementService.getAnnouncementsByCategory(selectedCategory);
      setAnnouncements(data);
      calculateStats(data);
    } catch (err) {
      setError("Error al cargar los avisos");
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [selectedCategory]);

  const calculateStats = (data: AnnouncementList[]) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    setStats({
      total: data.length,
      active: data.filter((a) => {
        const announcementDate = new Date(a.announcement_date);
        announcementDate.setHours(0, 0, 0, 0);
        return announcementDate >= today;
      }).length,
      thisMonth: data.filter(a => {
        const date = new Date(a.announcement_date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }).length,
    });
  };

  useEffect(() => {
    loadAnnouncements(false);
    const intervalId = window.setInterval(() => loadAnnouncements(true), ANNOUNCEMENTS_POLL_MS);
    return () => window.clearInterval(intervalId);
  }, [loadAnnouncements]);

  const handleCreateAnnouncement = async () => {
    const errors = validateForm(newAnnouncement);
    setCreateErrors(errors);
    if (Object.keys(errors).length) return;

    try {
      await announcementService.createAnnouncement(newAnnouncement);
      toast.success("Aviso publicado correctamente");
      setIsCreateDialogOpen(false);
      setNewAnnouncement(EMPTY_ANNOUNCEMENT_FORM);
      loadAnnouncements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear el aviso");
    }
  };

  const handleEditAnnouncement = async () => {
    if (!editingAnnouncement) return;
    const errors = validateForm({
      title: editingAnnouncement.title,
      description: editingAnnouncement.description,
      category: editingAnnouncement.category,
      announcement_date: editingAnnouncement.announcement_date,
      featured: editingAnnouncement.featured,
    });
    setEditErrors(errors);
    if (Object.keys(errors).length) return;

    try {
      await announcementService.updateAnnouncement(editingAnnouncement.id, {
        title: editingAnnouncement.title,
        description: editingAnnouncement.description,
        category: editingAnnouncement.category,
        announcement_date: editingAnnouncement.announcement_date,
      });
      toast.success("Aviso actualizado correctamente");
      setIsEditDialogOpen(false);
      setEditingAnnouncement(null);
      loadAnnouncements();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar el aviso");
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!deletingAnnouncement) return;
    setIsDeleting(true);
    try {
      await announcementService.deleteAnnouncement(deletingAnnouncement.id);
      toast.success("Aviso eliminado correctamente");
      setIsDeleteDialogOpen(false);
      setDeletingAnnouncement(null);
      loadAnnouncements();
    } catch (err) {
      toast.error("Error al eliminar el aviso");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-xl font-bold text-card-foreground">Gestión de Avisos</h1>
            <p className="text-sm text-gray-500 mt-1">
              Comunica noticias y eventos a los residentes
            </p>
          </div>
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => {
              setNewAnnouncement(EMPTY_ANNOUNCEMENT_FORM);
              setCreateErrors({});
              setIsCreateDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Aviso
          </Button>
        </div>

        {/* Estadisticas */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Total Avisos</p>
            <p className="text-2xl font-bold text-card-foreground">{stats.total}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Activos</p>
            <p className="text-2xl font-bold text-primary">{stats.active}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Este Mes</p>
            <p className="text-2xl font-bold text-card-foreground">{stats.thisMonth}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-4 py-3">
        <AnnouncementFilters
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
      </div>

      {/* Lista de avisos */}
      <div className="px-4 pb-6">
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-center">
            {error}
          </div>
        )}

        {!loading && !error && announcements.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No hay avisos disponibles
          </div>
        )}

        {!loading && !error && announcements.length > 0 && (
          <div className="grid items-stretch grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {announcements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                showControls={true}
                onEdit={() => {
                  setEditingAnnouncement(announcement);
                  setEditErrors({});
                  setIsEditDialogOpen(true);
                }}
                onDelete={() => {
                  setDeletingAnnouncement(announcement);
                  setIsDeleteDialogOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form Crear Aviso */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setNewAnnouncement(EMPTY_ANNOUNCEMENT_FORM);
          setCreateErrors({});
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Aviso</DialogTitle>
            <DialogDescription>
              Crea un nuevo aviso para los residentes
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ej: Corte de agua programado"
                maxLength={TITLE_MAX_LENGTH}
                value={newAnnouncement.title}
                onChange={(e) => {
                  setNewAnnouncement({ ...newAnnouncement, title: e.target.value });
                  validateField('title', e.target.value, true);
                }}
              />
              <div className="flex items-center justify-between mt-1">
                {createErrors.title ? (
                  <p className="text-sm text-destructive">{createErrors.title}</p>
                ) : (
                  <div />
                )}
                <div className={`text-xs ${createErrors.title ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {newAnnouncement.title.length}/{TITLE_MAX_LENGTH}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="category">Categoría *</Label>
              <Select
                value={newAnnouncement.category}
                onChange={(e) => setNewAnnouncement({
                  ...newAnnouncement,
                  category: e.target.value as AnnouncementCategory
                })}
                className="w-full"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Descripción *</Label>
              <Textarea
                id="description"
                placeholder="Describe el aviso en detalle..."
                rows={4}
                maxLength={DESCRIPTION_MAX_LENGTH}
                value={newAnnouncement.description}
                onChange={(e) => {
                  setNewAnnouncement({ ...newAnnouncement, description: e.target.value });
                  validateField('description', e.target.value, true);
                }}
                required
              />
              <div className="flex items-center justify-between mt-1">
                {createErrors.description ? (
                  <p className="text-sm text-destructive">{createErrors.description}</p>
                ) : (
                  <div />
                )}
                <div className={`text-xs ${createErrors.description ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {newAnnouncement.description.length}/{DESCRIPTION_MAX_LENGTH}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="date">Fecha del aviso *</Label>
              <Input
                id="date"
                type="date"
                min={todayDate}
                value={newAnnouncement.announcement_date}
                onChange={(e) => {
                  setNewAnnouncement({ ...newAnnouncement, announcement_date: e.target.value });
                  validateField('announcement_date', e.target.value, true);
                }}
              />
              {createErrors.announcement_date && <p className="text-sm text-destructive mt-1">{createErrors.announcement_date}</p>}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className={`bg-primary hover:bg-primary/90 text-primary-foreground ${!canCreate ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleCreateAnnouncement}
              disabled={!canCreate}
            >
              <Plus className="w-4 h-4 mr-2" />
              Publicar Aviso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo Editar Aviso */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsEditDialogOpen(false);
          setEditingAnnouncement(null);
          setEditErrors({});
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Aviso</DialogTitle>
            <DialogDescription>
              Modifica la información del aviso
            </DialogDescription>
          </DialogHeader>

          {editingAnnouncement && (
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-title">Título *</Label>
                <Input
                  id="edit-title"
                  maxLength={TITLE_MAX_LENGTH}
                  value={editingAnnouncement.title}
                  onChange={(e) => {
                    setEditingAnnouncement({
                      ...editingAnnouncement,
                      title: e.target.value
                    });
                    validateField('title', e.target.value, false);
                  }}
                />
                <div className="flex items-center justify-between mt-1">
                  {editErrors.title ? (
                    <p className="text-sm text-destructive">{editErrors.title}</p>
                  ) : (
                    <div />
                  )}
                  <div className={`text-xs ${editErrors.title ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {editingAnnouncement.title.length}/{TITLE_MAX_LENGTH}
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-category">Categoría *</Label>
                <Select
                  value={editingAnnouncement.category}
                  onChange={(e) => setEditingAnnouncement({
                    ...editingAnnouncement,
                    category: e.target.value as AnnouncementCategory
                  })}
                  className="w-full"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-description">Descripción *</Label>
                <Textarea
                  id="edit-description"
                  rows={4}
                  maxLength={DESCRIPTION_MAX_LENGTH}
                  value={editingAnnouncement.description}
                    onChange={(e) => {
                      setEditingAnnouncement({
                        ...editingAnnouncement,
                        description: e.target.value
                      });
                      validateField('description', e.target.value, false);
                    }}
                  required
                />
                <div className="flex items-center justify-between mt-1">
                  {editErrors.description ? (
                    <p className="text-sm text-destructive">{editErrors.description}</p>
                  ) : (
                    <div />
                  )}
                  <div className={`text-xs ${editErrors.description ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {editingAnnouncement.description.length}/{DESCRIPTION_MAX_LENGTH}
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-date">Fecha del aviso *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  min={todayDate}
                  value={editingAnnouncement.announcement_date}
                    onChange={(e) => {
                      setEditingAnnouncement({
                        ...editingAnnouncement,
                        announcement_date: e.target.value
                      });
                      validateField('announcement_date', e.target.value, false);
                    }}
                />
                {editErrors.announcement_date && <p className="text-sm text-destructive mt-1">{editErrors.announcement_date}</p>}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className={`bg-primary hover:bg-primary/90 text-primary-foreground ${!canSave ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleEditAnnouncement}
              disabled={!canSave}
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Eliminar Aviso */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setIsDeleteDialogOpen(open);
            if (!open) setDeletingAnnouncement(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle className="text-center">Eliminar</DialogTitle>
            <DialogDescription className="text-center">
              ¿Estás seguro de que deseas eliminar este aviso?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {deletingAnnouncement && (
            <div className="rounded-lg border border-gray-200 bg-muted/30 p-3 text-sm">
              <p className="font-medium text-card-foreground line-clamp-1">{deletingAnnouncement.title}</p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingAnnouncement(null);
              }}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteAnnouncement} disabled={isDeleting}>
              {isDeleting ? "Eliminando..." : "Eliminar aviso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}