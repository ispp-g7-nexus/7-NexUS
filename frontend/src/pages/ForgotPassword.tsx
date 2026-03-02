import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { authService } from "../services/auth";

export function ForgotPassword() {
    const [email, setEmail] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await authService.requestPasswordReset(email);
            toast.success("Si el correo existe, recibirás las instrucciones.");
        } catch (error) {
            toast.error("Ocurrió un error al procesar tu solicitud.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardContent className="p-8 space-y-6">
                    <h2 className="text-2xl font-bold text-center">Recuperar Contraseña</h2>
                    <p className="text-center text-gray-500 text-sm">Ingresa tu correo y te enviaremos un enlace.</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            type="email"
                            placeholder="tu@email.com"
                            className="w-full p-3 border rounded-md"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <Button type="submit" className="w-full bg-[#1B5E20] hover:bg-[#144a19] text-white">
                            Enviar enlace
                        </Button>
                    </form>
                    <div className="text-center mt-4">
                        <Link to="/" className="text-sm text-[#35C759] hover:underline">Volver al login</Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}