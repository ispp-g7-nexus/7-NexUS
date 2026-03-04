import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { authService } from "../services/auth";


export function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState("");

    // Extraemos los parámetros que envió Django en la URL
    const uid = searchParams.get("uid");
    const token = searchParams.get("token");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uid || !token) {
            toast.error("El enlace no es válido.");
            return;
        }

        try {
            await authService.confirmPasswordReset({ uid, token, new_password: password });
            toast.success("¡Contraseña actualizada! Ya puedes iniciar sesión.");
            navigate("/");
        } catch (error) {
            toast.error("El enlace ha expirado o es inválido.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardContent className="p-8 space-y-6">
                    <h2 className="text-2xl font-bold text-center">Nueva Contraseña</h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            className="w-full p-3 border rounded-md"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                        <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white">
                            Actualizar Contraseña
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}