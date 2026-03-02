import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Lock, Mail, Shield } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import logo from "../assets/logo.png";
import { authService } from "../services/auth";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface AdminLoginProps {
    onLogin: () => void;
    onBack: () => void;
}

export function AdminLogin({ onLogin, onBack }: AdminLoginProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await authService.login({ email, password, portal: "admin" });
            toast.success("Acceso concedido");
            onLogin();
        } catch (error: any) {
            toast.error(error.message || "Credenciales inválidas o sin permisos");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-md space-y-6">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                    <ArrowLeft className="w-5 h-5" /> <span>Volver</span>
                </button>

                <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 mb-4 flex items-center justify-center">
                        <img src={logo} alt="NexUS Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">NexUS</h1>
                    <p className="text-gray-500 mt-2">Panel de Administración</p>
                </div>

                <Card className="border-gray-200 shadow-xl shadow-gray-200/50">
                    <CardContent className="p-8 space-y-6">
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs text-orange-900 font-semibold">Acceso Restringido</p>
                                <p className="text-xs text-orange-700 mt-1">Este panel requiere credenciales administrativas. Todos los accesos son registrados.</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="admin-email" className="text-gray-700">Correo Administrativo</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <Input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-11 h-12" required />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="admin-password" className="text-gray-700">Contraseña</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <Input id="admin-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-11 pr-11 h-12" required />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#509550] focus:ring-[#509550]" />
                                    <span className="text-gray-600">Mantener sesión</span>
                                </label>
                                <Link to="/forgot-password" className="text-[#509550] hover:text-[#3d7a3d] font-medium">
                                    Recuperar acceso
                                </Link>
                            </div>

                            <Button type="submit" disabled={isLoading} className="w-full h-14 text-lg bg-[#509550] hover:bg-[#3d7a3d] text-white shadow-md transition-all">
                                {isLoading ? "Verificando..." : <><Shield className="mr-3 w-5 h-5" /> Acceder al Panel</>}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}