import {
  User,
  Mail,
  MapPin,
  Settings,
  Shield,
  LogOut,
  ChevronRight,
  FileText,
  Bell,
} from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "./ui/avatar";
import { Switch } from "./ui/switch";

export function StudentProfile() {
  return (
    <div className="min-h-full bg-gray-50 pb-20">
      {/* Header Verde */}
      <div className="bg-[#1B5E20] px-6 py-4 flex justify-between items-center">
        <h1 className="text-white text-xl font-bold">Perfil</h1>
        <Button
          size="icon"
          variant="ghost"
          className="text-white hover:bg-white/20 rounded-full"
        >
          <Bell className="w-5 h-5" />
        </Button>
      </div>

      {/* Cabecera Perfil */}
      <div className="bg-white pb-6 pt-8 px-6 rounded-b-3xl shadow-sm">
        <div className="flex flex-col items-center text-center">
          <Avatar className="w-24 h-24 border-4 border-gray-50 mb-4 shadow-md">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback className="bg-[#35C759] text-white text-2xl">
              MR
            </AvatarFallback>
          </Avatar>
          <h1 className="text-xl font-bold text-gray-900">
            María Ruiz
          </h1>
          <p className="text-gray-500 text-sm mb-4">
            Ingeniería Informática • 3º Año
          </p>

          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-xs font-bold">
            <Shield className="w-3 h-3" />
            Residente Verificado
          </div>
        </div>

        {/* Stats Rápidas */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          <ProfileStat number="302-B" label="Habitación" />
          <ProfileStat number="Torre A" label="Edificio" />
          <ProfileStat number="28" label="Puntos Social" />
        </div>
      </div>

      {/* Opciones */}
      <div className="p-4 space-y-4">
        {/* Sección Datos */}
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2 mb-2">
            Mis Datos
          </h3>
          <Card className="border-none shadow-sm overflow-hidden rounded-xl">
            <OptionItem
              icon={<Mail className="w-5 h-5" />}
              label="maria.ruiz@uni.edu"
              value="Editar"
            />
            <OptionItem
              icon={<FileText className="w-5 h-5" />}
              label="Mis Documentos"
              hasArrow
            />
          </Card>
        </div>

        {/* Sección Configuración */}
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-2 mb-2">
            Ajustes
          </h3>
          <Card className="border-none shadow-sm overflow-hidden rounded-xl">
            <div className="p-4 flex items-center justify-between border-b border-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                  <Settings className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-gray-900">
                  Notificaciones
                </span>
              </div>
              <Switch />
            </div>
            <OptionItem
              icon={<Shield className="w-5 h-5" />}
              label="Cambiar Contraseña"
              hasArrow
            />
          </Card>
        </div>

        <Button
          variant="ghost"
          className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 h-12"
        >
          <LogOut className="w-4 h-4 mr-2" /> Cerrar Sesión
        </Button>
      </div>
    </div>
  );
}

function ProfileStat({ number, label }: any) {
  return (
    <div className="flex flex-col items-center p-2 bg-gray-50 rounded-xl">
      <span className="font-bold text-gray-900">{number}</span>
      <span className="text-[10px] text-gray-500 uppercase">
        {label}
      </span>
    </div>
  );
}

function OptionItem({ icon, label, value, hasArrow }: any) {
  return (
    <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-900">
          {label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {value && (
          <span className="text-xs text-gray-400">{value}</span>
        )}
        {hasArrow && (
          <ChevronRight className="w-4 h-4 text-gray-300" />
        )}
      </div>
    </button>
  );
}