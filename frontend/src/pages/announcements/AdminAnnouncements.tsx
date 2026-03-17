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

function hasRequiredAnnouncementFields(data: { title: string; description: string; announcement_date: string }) {
  return Boolean(data.title.trim() && data.description.trim() && data.announcement_date);
}

export function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<AnnouncementList[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [error, setError] = useState<string | null>(null);
  
  // Estados para diálogos
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementList | null>(null);
  const [deletingAnnouncement, setDeletingAnnouncement] = useState<AnnouncementList | null>(null);
  
  const [newAnnouncement, setNewAnnouncement] = useState(EMPTY_ANNOUNCEMENT_FORM);

  // Estadísticas
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    thisMonth: 0,
  });

  const todayDate = getLocalDateString();

  const isPastDate = (dateValue: string) => {
    if (!dateValue) return false;

    const normalizedDate = dateValue.slice(0, 10);
    return normalizedDate < todayDate;
  };

  const loadAnnouncements = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await announcementService.getAnnouncementsByCategory(selectedCategory);
      setAnnouncements(data);
      calculateStats(data);
    } catch (err) {
      setError("Error al cargar los avisos");
      console.error(err);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadAnnouncements(false);

    const intervalId = window.setInterval(() => {
      loadAnnouncements(true);
    }, ANNOUNCEMENTS_POLL_MS);

    return () => window.clearInterval(intervalId);
  }, [loadAnnouncements]);

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

  const handleCreateAnnouncement = async () => {
    if (!hasRequiredAnnouncementFields(newAnnouncement)) {
      toast.error("Por favor, completa todos los campos obligatorios");
      return;
    }

    if (isPastDate(newAnnouncement.announcement_date)) {
      toast.error("La fecha del aviso no puede ser anterior a hoy");
      return;
    }

    try {
      await announcementService.createAnnouncement(newAnnouncement);
      
      toast.success("Aviso publicado correctamente");
      setIsCreateDialogOpen(false);
      setNewAnnouncement(EMPTY_ANNOUNCEMENT_FORM);
      loadAnnouncements();
    } catch (err) {
      toast.error("Error al crear el aviso");
      console.error(err);
    }
  };

  const handleEditAnnouncement = async () => {
    if (!editingAnnouncement) return;

    if (!hasRequiredAnnouncementFields(editingAnnouncement)) {
      toast.error("Por favor, completa todos los campos obligatorios");
      return;
    }

    if (isPastDate(editingAnnouncement.announcement_date)) {
      toast.error("La fecha del aviso no puede ser anterior a hoy");
      return;
    }

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
      toast.error("Error al actualizar el aviso");
      console.error(err);
    }
  };

  const openDeleteDialog = (announcement: AnnouncementList) => {
    setDeletingAnnouncement(announcement);
    setIsDeleteDialogOpen(true);
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
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditDialog = (announcement: AnnouncementList) => {
    setEditingAnnouncement(announcement);
    setIsEditDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-4 py-4">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-xl font-bold text-card-foreground">Gestión de Avisos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Comunica noticias y eventos a los residentes
            </p>
          </div>
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Aviso
          </Button>
        </div>

        {/* Estadisticas */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">Total Avisos</p>
            <p className="text-2xl font-bold text-card-foreground">{stats.total}</p>
          </div>
          <div className="bg-muted rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">Activos</p>
            <p className="text-2xl font-bold text-primary">{stats.active}</p>
          </div>
          <div className="bg-muted rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1">Este Mes</p>
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
          <div className="text-center py-12 text-muted-foreground">
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
                onEdit={() => openEditDialog(announcement)}
                onDelete={() => openDeleteDialog(announcement)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Form Crear Aviso */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Aviso</DialogTitle>
            <DialogDescription>
              Crea un nuevo aviso para los residentes
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ej: Corte de agua programado"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
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

            <div className="space-y-2">
              <Label htmlFor="description">Descripción *</Label>
              <Textarea
                id="description"
                placeholder="Describe el aviso en detalle..."
                rows={4}
                value={newAnnouncement.description}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, description: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Fecha del aviso *</Label>
              <Input
                id="date"
                type="date"
                min={todayDate}
                value={newAnnouncement.announcement_date}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, announcement_date: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleCreateAnnouncement}
            >
              <Plus className="w-4 h-4 mr-2" />
              Publicar Aviso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo Editar Aviso */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Aviso</DialogTitle>
            <DialogDescription>
              Modifica la información del aviso
            </DialogDescription>
          </DialogHeader>

          {editingAnnouncement && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Título *</Label>
                <Input
                  id="edit-title"
                  value={editingAnnouncement.title}
                  onChange={(e) => setEditingAnnouncement({
                    ...editingAnnouncement,
                    title: e.target.value
                  })}
                />
              </div>

              <div className="space-y-2">
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

              <div className="space-y-2">
                <Label htmlFor="edit-description">Descripción *</Label>
                <Textarea
                  id="edit-description"
                  rows={4}
                  value={editingAnnouncement.description}
                  onChange={(e) => setEditingAnnouncement({
                    ...editingAnnouncement,
                    description: e.target.value
                  })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-date">Fecha del aviso *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  min={todayDate}
                  value={editingAnnouncement.announcement_date}
                  onChange={(e) => setEditingAnnouncement({
                    ...editingAnnouncement,
                    announcement_date: e.target.value
                  })}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleEditAnnouncement}
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
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
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