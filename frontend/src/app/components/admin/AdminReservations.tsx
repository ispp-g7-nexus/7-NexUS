import { useState } from "react";
import {
  Plus,
  Calendar,
  Clock,
  Package,
  Users,
  Settings,
  Wind,
  Shirt,
  WashingMachine,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import { Label } from "../ui/label";
import { toast } from "sonner";

interface Item {
  id: number;
  name: string;
  category: string;
  stock: number;
  available: number;
  loanPeriod: number;
  location: string;
  activeLoans: number;
  description?: string;
}

interface Loan {
  id: number;
  itemName: string;
  studentName: string;
  room: string;
  startDate: string;
  endDate: string;
  status: "active" | "overdue";
}

export function AdminReservations() {
  const [selectedTab, setSelectedTab] = useState("items");
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [newItem, setNewItem] = useState({
    name: "",
    category: "",
    stock: 1,
    loanPeriod: 24,
    location: "",
    description: "",
  });

  const [items, setItems] = useState<Item[]>([
    {
      id: 1,
      name: "Aspiradora Dyson V11",
      category: "Limpieza",
      stock: 3,
      available: 2,
      loanPeriod: 24,
      location: "Almacén Principal",
      activeLoans: 1,
    },
    {
      id: 2,
      name: "Plancha de Vapor",
      category: "Lavandería",
      stock: 5,
      available: 4,
      loanPeriod: 12,
      location: "Lavandería",
      activeLoans: 1,
    },
    {
      id: 3,
      name: "Carrito de Compra",
      category: "Utilidades",
      stock: 2,
      available: 0,
      loanPeriod: 48,
      location: "Recepción",
      activeLoans: 2,
    },
  ]);

  const [activeLoans, setActiveLoans] = useState<Loan[]>([
    {
      id: 1,
      itemName: "Aspiradora Dyson V11",
      studentName: "María González",
      room: "302-B",
      startDate: "17 Feb 2026, 10:30",
      endDate: "18 Feb 2026, 10:30",
      status: "active",
    },
    {
      id: 2,
      itemName: "Plancha de Vapor",
      studentName: "Carlos Ruiz",
      room: "305-A",
      startDate: "17 Feb 2026, 14:00",
      endDate: "18 Feb 2026, 02:00",
      status: "active",
    },
    {
      id: 3,
      itemName: "Carrito de Compra",
      studentName: "Laura Pérez",
      room: "201-B",
      startDate: "16 Feb 2026, 09:00",
      endDate: "18 Feb 2026, 09:00",
      status: "overdue",
    },
  ]);

  // Función para agregar objeto
  const handleAddItem = () => {
    if (!newItem.name || !newItem.category || !newItem.location) {
      toast.error("Por favor, completa todos los campos obligatorios");
      return;
    }

    const itemToAdd: Item = {
      id: items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1,
      name: newItem.name,
      category: newItem.category,
      stock: newItem.stock,
      available: newItem.stock,
      loanPeriod: newItem.loanPeriod,
      location: newItem.location,
      activeLoans: 0,
      description: newItem.description,
    };

    setItems([...items, itemToAdd]);
    
    // Resetear formulario
    setNewItem({
      name: "",
      category: "",
      stock: 1,
      loanPeriod: 24,
      location: "",
      description: "",
    });
    
    setIsAddItemDialogOpen(false);
    toast.success("Objeto agregado correctamente");
  };

  // Función para editar objeto
  const handleEditItem = () => {
    if (!editingItem) return;

    const updatedItems = items.map(i => 
      i.id === editingItem.id ? editingItem : i
    );

    setItems(updatedItems);
    setIsEditItemDialogOpen(false);
    setEditingItem(null);
    toast.success("Objeto actualizado correctamente");
  };

  // Función para eliminar objeto
  const handleDeleteItem = (id: number) => {
    setItems(items.filter(i => i.id !== id));
    toast.success("Objeto eliminado correctamente");
  };

  // Función para abrir diálogo de edición
  const openEditItemDialog = (item: Item) => {
    setEditingItem({ ...item });
    setIsEditItemDialogOpen(true);
  };

  // Función para marcar préstamo como devuelto
  const handleReturnLoan = (loanId: number) => {
    const loan = activeLoans.find(l => l.id === loanId);
    if (!loan) return;

    // Actualizar disponibilidad del objeto
    const updatedItems = items.map(item => {
      if (item.name === loan.itemName) {
        return {
          ...item,
          available: item.available + 1,
          activeLoans: item.activeLoans - 1,
        };
      }
      return item;
    });

    setItems(updatedItems);
    setActiveLoans(activeLoans.filter(l => l.id !== loanId));
    toast.success("Préstamo marcado como devuelto");
  };

  // Calcular estadísticas
  const totalItems = items.reduce((sum, item) => sum + item.stock, 0);
  const totalOnLoan = items.reduce((sum, item) => sum + item.activeLoans, 0);
  const totalAvailable = items.reduce((sum, item) => sum + item.available, 0);

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Gestión de Reservas
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Administra espacios y objetos prestables
            </p>
          </div>
          <Button 
            className="bg-[#4A7C59] hover:bg-[#3d6448] text-white"
            onClick={() => setIsAddItemDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Objeto
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#F5F5F5] rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Total Objetos</p>
            <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
          </div>
          <div className="bg-[#F5F5F5] rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">En Préstamo</p>
            <p className="text-2xl font-bold text-orange-600">{totalOnLoan}</p>
          </div>
          <div className="bg-[#F5F5F5] rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Disponibles</p>
            <p className="text-2xl font-bold text-[#4A7C59]">{totalAvailable}</p>
          </div>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="bg-gray-100 p-1">
          <TabsTrigger value="items">Objetos</TabsTrigger>
          <TabsTrigger value="loans">Préstamos Activos</TabsTrigger>
          <TabsTrigger value="spaces">Espacios</TabsTrigger>
        </TabsList>

        {/* Tab Objetos */}
        <TabsContent value="items" className="mt-4 space-y-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600">
                      <Package className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-gray-900">
                          {item.name}
                        </h3>
                        <Badge
                          className={`${
                            item.available > 0
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          } border-0`}
                        >
                          {item.available > 0 ? "Disponible" : "No disponible"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Package className="w-3.5 h-3.5" />
                          <span>
                            Stock: {item.available}/{item.stock}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{item.loanPeriod}h préstamo</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Users className="w-3.5 h-3.5" />
                          <span>{item.activeLoans} activos</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Settings className="w-3.5 h-3.5" />
                          <span>{item.location}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => openEditItemDialog(item)}
                        >
                          <Edit2 className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Tab Préstamos Activos */}
        <TabsContent value="loans" className="mt-4 space-y-3">
          {activeLoans.map((loan) => (
            <Card
              key={loan.id}
              className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">
                      {loan.itemName}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {loan.studentName} • Hab {loan.room}
                    </p>
                  </div>
                  <Badge
                    className={`${
                      loan.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    } border-0`}
                  >
                    {loan.status === "active" ? (
                      <>
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Activo
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Retrasado
                      </>
                    )}
                  </Badge>
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Inicio: {loan.startDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Fin: {loan.endDate}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-[#4A7C59] hover:bg-[#3d6448] h-8 text-xs"
                    onClick={() => handleReturnLoan(loan.id)}
                  >
                    Marcar Devuelto
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                  >
                    Contactar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {activeLoans.length === 0 && (
            <Card className="border border-gray-100">
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay préstamos activos</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab Espacios */}
        <TabsContent value="spaces" className="mt-4">
          <Card className="border border-gray-100 shadow-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">
                Gestión de Espacios
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                La gestión de espacios comunes se implementará próximamente
              </p>
              <Button
                variant="outline"
                className="border-[#4A7C59] text-[#4A7C59]"
              >
                Próximamente
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Agregar Objeto */}
      <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl max-w-[90%] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agregar Objeto Prestable</DialogTitle>
            <DialogDescription>
              Configura un nuevo objeto para préstamo a estudiantes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Objeto *</Label>
              <Input 
                id="name"
                placeholder="Ej: Aspiradora Dyson V11" 
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoría *</Label>
              <Select
                value={newItem.category}
                onValueChange={(value) => setNewItem({ ...newItem, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Limpieza">Limpieza</SelectItem>
                  <SelectItem value="Lavandería">Lavandería</SelectItem>
                  <SelectItem value="Utilidades">Utilidades</SelectItem>
                  <SelectItem value="Cocina">Cocina</SelectItem>
                  <SelectItem value="Deportes">Deportes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="stock">Stock Total *</Label>
                <Input 
                  id="stock"
                  type="number" 
                  placeholder="0" 
                  min="1" 
                  value={newItem.stock}
                  onChange={(e) => setNewItem({ ...newItem, stock: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loanPeriod">Período (horas) *</Label>
                <Input 
                  id="loanPeriod"
                  type="number" 
                  placeholder="24" 
                  min="1" 
                  value={newItem.loanPeriod}
                  onChange={(e) => setNewItem({ ...newItem, loanPeriod: parseInt(e.target.value) || 24 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Ubicación *</Label>
              <Input 
                id="location"
                placeholder="Ej: Almacén Principal" 
                value={newItem.location}
                onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                placeholder="Información adicional sobre el objeto..."
                rows={3}
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-[#4A7C59] hover:bg-[#3d6448] text-white"
              onClick={handleAddItem}
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Objeto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Objeto */}
      <Dialog open={isEditItemDialogOpen} onOpenChange={setIsEditItemDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl max-w-[90%] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Objeto Prestable</DialogTitle>
            <DialogDescription>
              Modifica la información del objeto
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nombre del Objeto *</Label>
                <Input 
                  id="edit-name"
                  placeholder="Ej: Aspiradora Dyson V11" 
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Categoría *</Label>
                <Select
                  value={editingItem.category}
                  onValueChange={(value) => setEditingItem({ ...editingItem, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Limpieza">Limpieza</SelectItem>
                    <SelectItem value="Lavandería">Lavandería</SelectItem>
                    <SelectItem value="Utilidades">Utilidades</SelectItem>
                    <SelectItem value="Cocina">Cocina</SelectItem>
                    <SelectItem value="Deportes">Deportes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-stock">Stock Total *</Label>
                  <Input 
                    id="edit-stock"
                    type="number" 
                    min="1" 
                    value={editingItem.stock}
                    onChange={(e) => setEditingItem({ 
                      ...editingItem, 
                      stock: parseInt(e.target.value) || 1 
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-loanPeriod">Período (horas) *</Label>
                  <Input 
                    id="edit-loanPeriod"
                    type="number" 
                    min="1" 
                    value={editingItem.loanPeriod}
                    onChange={(e) => setEditingItem({ 
                      ...editingItem, 
                      loanPeriod: parseInt(e.target.value) || 24 
                    })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">Ubicación *</Label>
                <Input 
                  id="edit-location"
                  placeholder="Ej: Almacén Principal" 
                  value={editingItem.location}
                  onChange={(e) => setEditingItem({ ...editingItem, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Descripción (opcional)</Label>
                <Textarea
                  id="edit-description"
                  placeholder="Información adicional sobre el objeto..."
                  rows={3}
                  value={editingItem.description || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditItemDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-[#4A7C59] hover:bg-[#3d6448] text-white"
              onClick={handleEditItem}
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}