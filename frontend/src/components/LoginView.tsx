import { Shield, User } from "lucide-react";
import { UserRole } from "../App";
import logo from "../assets/logo.png";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

interface LoginViewProps {
    onSelectRole: (role: UserRole) => void;
}

export function LoginView({ onSelectRole }: LoginViewProps) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 mb-4 flex items-center justify-center">
                        <img src={logo} alt="NexUS Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">NexUS</h1>
                    <p className="text-gray-500 mt-2">Plataforma Integral de Gestión de Residencias</p>
                </div>

                <Card className="border-gray-200 shadow-xl shadow-gray-200/50">
                    <CardContent className="p-8 space-y-6">
                        <div className="space-y-2 text-center">
                            <h2 className="text-xl font-semibold text-gray-900">Bienvenido de nuevo</h2>
                            <p className="text-sm text-gray-500">Selecciona tu perfil para acceder</p>
                        </div>

                        <div className="space-y-4">
                            <Button
                                className="w-full h-14 text-lg bg-[#509550] hover:bg-[#3d7a3d] text-white shadow-md transition-all"
                                onClick={() => onSelectRole("student")}
                            >
                                <User className="mr-3 w-5 h-5" /> Soy Residente
                            </Button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-gray-200" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-gray-400">o acceso administrativo</span>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full h-14 text-lg border-2 hover:bg-gray-50 hover:text-gray-900 text-gray-700"
                                onClick={() => onSelectRole("admin")}
                            >
                                <Shield className="mr-3 w-5 h-5" /> Administración
                            </Button>
                        </div>
                    </CardContent>
                </Card>
                <p className="text-center text-sm text-gray-400">© 2026 NexUS System. Todos los derechos reservados.</p>
            </div>
        </div>
    );
}