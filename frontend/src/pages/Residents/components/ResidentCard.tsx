// src/pages/Residents/components/ResidentCard.tsx
import { Calendar, Edit2, Mail, MapPin, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import type { Resident } from "../../../services/residents";

interface ResidentCardProps {
  resident: Resident;
  onEdit: (resident: Resident) => void;
  onDelete: (resident: Resident) => void;
}

function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join("");
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge variant="success">Activo</Badge>
  ) : (
    <Badge variant="muted">Inactivo</Badge>
  );
}

export function ResidentCard({ resident, onEdit, onDelete }: ResidentCardProps) {
  const { full_name, email, room, building, check_in_date, is_active } = resident;

  return (
    <Card className="hover:shadow-md transition-shadow border-gray-200">
      <CardContent className="p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        {/* Avatar */}
        <Avatar className="h-12 w-12 border border-gray-200 shrink-0">
          <AvatarFallback className="bg-green-600/10 text-green-600 font-bold text-base">
            {getInitials(full_name)}
          </AvatarFallback>
        </Avatar>

        {/* Main info grid */}
        <div className="flex-1 min-w-0 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
          {/* Name + email */}
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{full_name}</h3>
            <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{email}</span>
            </div>
          </div>

          {/* Room + check-in */}
          <div className="flex flex-col justify-center text-sm text-gray-500 gap-1">
            {(room || building) && (
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>
                  {room && <>Hab. {room}</>}
                  {room && building && <span className="text-gray-400"> · </span>}
                  {building && <>Edif. {building}</>}
                </span>
              </div>
            )}
            {check_in_date && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>
                  Check-in:{" "}
                  {new Date(check_in_date).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center sm:justify-end">
            <StatusBadge isActive={is_active} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-green-600 h-8 w-8"
            title="Editar residente"
            onClick={() => onEdit(resident)}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-red-600 h-8 w-8"
            title="Eliminar residente"
            onClick={() => onDelete(resident)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
