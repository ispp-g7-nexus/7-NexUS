import { useState, useEffect } from "react";
import { Search, Loader2, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { chatsService, type ChatResident } from "../services/chats";
import { toast } from "sonner";

interface ResidentSelectorProps {
  readonly currentMembers: Array<{ id: number; email: string }>;
  readonly onAddMembers: (residents: ChatResident[]) => Promise<void>;
}

const getAvailableResidents = (
  allResidents: ChatResident[],
  currentMembers: Array<{ id: number; email: string }>
): ChatResident[] => {
  const currentMemberEmails = new Set(currentMembers.map((member) => member.email));
  return allResidents.filter((resident) => !currentMemberEmails.has(resident.email));
};

export function ResidentSelector({
  currentMembers,
  onAddMembers,
}: Readonly<ResidentSelectorProps>) {
  const [residents, setResidents] = useState<ChatResident[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedResidents, setSelectedResidents] = useState<Set<number>>(
    new Set()
  );
  const [isAdding, setIsAdding] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const loadResidents = async () => {
    setLoading(true);
    try {
      const data = await chatsService.listChatResidents();
      setResidents(getAvailableResidents(data, currentMembers));
    } catch (error) {
      toast.error("Error al cargar los residentes");
      console.error("Error loading residents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMembers]);

  const filteredResidents = residents.filter(
    (resident) =>
      resident.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resident.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleResident = (residentId: number) => {
    const newSelected = new Set(selectedResidents);
    if (newSelected.has(residentId)) {
      newSelected.delete(residentId);
    } else {
      newSelected.add(residentId);
    }
    setSelectedResidents(newSelected);
  };

  const handleSelectAll = () => {
    const allFilteredSelected =
      filteredResidents.length > 0 && selectedResidents.size === filteredResidents.length;

    if (allFilteredSelected) {
      setSelectedResidents(new Set());
      return;
    }

    setSelectedResidents(new Set(filteredResidents.map((resident) => resident.id)));
  };

  const handleAddMembers = async () => {
    if (selectedResidents.size === 0) {
      toast.error("Selecciona al menos un residente");
      return;
    }

    const residentsToAdd = residents.filter((r) =>
      selectedResidents.has(r.id)
    );

    setIsAdding(true);
    try {
      await onAddMembers(residentsToAdd);
      setSelectedResidents(new Set());
      setSearchTerm("");
      await loadResidents();
    } catch (error) {
      console.error("Error adding members:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const selectedResidentsLabel =
    selectedResidents.size > 0 ? `${selectedResidents.size} ` : "";
  const residentPluralSuffix = selectedResidents.size === 1 ? "" : "s";

  const renderDropdownContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          <span className="ml-2 text-sm text-gray-500">Cargando residentes...</span>
        </div>
      );
    }

    if (filteredResidents.length === 0) {
      return (
        <div className="py-6 text-center text-gray-500">
          {residents.length === 0
            ? "No hay residentes disponibles"
            : "No se encontraron residentes con ese criterio"}
        </div>
      );
    }

    return (
      <>
        <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md">
          <div className="sticky top-0 bg-gray-100 px-4 py-2 border-b border-gray-300">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={
                  selectedResidents.size === filteredResidents.length &&
                  filteredResidents.length > 0
                }
                onChange={handleSelectAll}
                aria-label="Seleccionar todos los residentes filtrados"
                className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              Seleccionar todos ({selectedResidents.size}/{filteredResidents.length})
            </label>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredResidents.map((resident) => (
              <label
                key={resident.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedResidents.has(resident.id)}
                  onChange={() => handleToggleResident(resident.id)}
                  aria-label={`Seleccionar residente ${resident.full_name}`}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {resident.full_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{resident.email}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <Button
          size="sm"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={handleAddMembers}
          disabled={isAdding || selectedResidents.size === 0}
        >
          {isAdding ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Añadiendo...
            </>
          ) : (
            <>
              Añadir {selectedResidentsLabel}
              residente{residentPluralSuffix}
            </>
          )}
        </Button>
      </>
    );
  };

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        className="w-full justify-between bg-white hover:bg-gray-50"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="resident-selector-dropdown"
      >
        <div className="flex items-center gap-2">
          <span>Añadir Residentes</span>
          {selectedResidents.size > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
              {selectedResidents.size} seleccionados
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${
            isOpen ? "transform rotate-180" : ""
          }`}
        />
      </Button>

      {isOpen && (
        <div id="resident-selector-dropdown" className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o email..."
              className="pl-10"
              autoFocus
            />
          </div>
          {renderDropdownContent()}
        </div>
      )}
    </div>
  );
}
