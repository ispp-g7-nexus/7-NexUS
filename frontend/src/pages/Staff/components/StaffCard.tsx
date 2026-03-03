// src/pages/Staff/components/StaffCard.tsx
import { Clock, Edit, Mail, MapPin, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "../../../components/ui/avatar";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import type { StaffMember, StaffStatus } from "../../../services/staff";

interface StaffCardProps {
  member: StaffMember;
  onEdit: (member: StaffMember) => void;
  onDelete: (member: StaffMember) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join("");
}

const STATUS_LABEL: Record<StaffStatus, string> = {
  active: "Activo",
  inactive: "Inactivo",
  holidays: "De Vacaciones",
};

const STATUS_VARIANT: Record<StaffStatus, "success" | "muted" | "warning"> = {
  active: "success",
  inactive: "muted",
  holidays: "warning",
};

export function StaffCard({ member, onEdit, onDelete }: StaffCardProps) {
  const { full_name, job_title, department, email, location, schedule, status, role } = member;

  return (
    <Card className="hover:shadow-md transition-shadow border-gray-200">
      <CardContent className="p-6">
        {/* Top row: avatar + name + actions */}
        <div className="flex items-start justify-between mb-4 gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Avatar className="h-14 w-14 border-2 border-gray-100 shrink-0">
              <AvatarFallback className="bg-[#509550] text-white font-semibold text-base">
                {getInitials(full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 truncate">{full_name}</h3>
              <p className="text-sm text-gray-500 truncate">{job_title}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="text-xs shrink-0">
                  {department}
                </Badge>
                <Badge variant={STATUS_VARIANT[status]} className="shrink-0">
                  {STATUS_LABEL[status]}
                </Badge>
                {role && (
                  <Badge variant="outline" className="text-xs shrink-0 text-[#509550] border-[#509550]/40">
                    {role}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Actions menu */}
          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-[#509550]"
              title="Editar"
              onClick={() => onEdit(member)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-red-600"
              title="Eliminar"
              onClick={() => onDelete(member)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2.5 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="w-4 h-4 text-gray-400 shrink-0" />
            <a
              href={`mailto:${email}`}
              className="text-[#509550] hover:underline truncate min-w-0"
            >
              {email}
            </a>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <span className="text-gray-600 truncate min-w-0">{location}</span>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <Clock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <span className="text-gray-600 truncate min-w-0">{schedule}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
