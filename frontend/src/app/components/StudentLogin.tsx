import { useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, User } from "lucide-react";

import logo from "../../assets/568c60154d65da3b07cabfc4ed599e47f97b560a.png";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface StudentLoginProps {
  onLogin: (payload: { email: string; password: string }) => Promise<{ ok: boolean; detail?: string }>;
  onBack: () => void;
}

export function StudentLogin({ onLogin, onBack }: StudentLoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const result = await onLogin({ email, password });
      if (!result.ok) {
        setErrorMessage(result.detail || "No se pudo iniciar sesion.");
      }
    } catch {
      setErrorMessage("Error de red al iniciar sesion.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-6"
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Volver</span>
        </button>

        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-24 h-24 mb-4 flex items-center justify-center">
            <img src={logo} alt="NexUS Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">NexUS</h1>
          <p className="text-gray-500 mt-2">Portal del Estudiante</p>
        </div>

        <Card className="border-gray-200 shadow-xl shadow-gray-200/50">
          <CardContent className="p-8 space-y-6">
            <div className="space-y-2 text-center">
              <h2 className="text-xl font-semibold text-gray-900">Bienvenido de nuevo</h2>
              <p className="text-sm text-gray-500">Ingresa tus credenciales para acceder</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700">
                  Correo Electronico
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu.email@universidad.edu"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="pl-11 h-12 border-gray-200 focus:border-[#509550] focus:ring-[#509550]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">
                  Contrasena
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pl-11 pr-11 h-12 border-gray-200 focus:border-[#509550] focus:ring-[#509550]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-[#509550] focus:ring-[#509550]"
                  />
                  <span className="text-gray-600">Recordarme</span>
                </label>
                <button type="button" className="text-[#509550] hover:text-[#3d7a3d] font-medium">
                  Recuperar acceso
                </button>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 text-lg bg-[#509550] hover:bg-[#3d7a3d] text-white shadow-md transition-all"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Iniciando sesion...</span>
                  </div>
                ) : (
                  <>
                    <User className="mr-3 w-5 h-5" />
                    Iniciar Sesion
                  </>
                )}
              </Button>

              {errorMessage && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}
            </form>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-700 text-center">
                <strong>Acceso real:</strong> usa tus credenciales de NexUS para esta residencia.
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-400">
          Nuevo en la residencia? <button className="font-semibold text-[#509550] hover:text-[#3d7a3d]">Solicita acceso</button>
        </p>
      </motion.div>
    </div>
  );
}
