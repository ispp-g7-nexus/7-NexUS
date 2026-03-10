import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { authService } from "../services/auth";

export function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await authService.requestPasswordReset(email);
            setEmail("");
            toast.success(response?.detail || "Te hemos enviado un correo con las instrucciones.");

        } catch (error: unknown) {
            if (error instanceof Error) {
                toast.error(error.message);
            }
            else {
                toast.error(String(error));
            }

        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardContent className="p-8 space-y-6">
                    <h2 className="text-2xl font-bold text-center">Recuperar Contraseña</h2>
                    <p className="text-center text-gray-500 text-sm">
                        Ingresa tu correo y te enviaremos un enlace.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            type="email"
                            placeholder="tu@email.com"
                            className="w-full p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                        <Button
                            type="submit"
                            className="w-full bg-primary hover:bg-primary/90 text-white"
                            disabled={isLoading}
                        >
                            {isLoading ? "Enviando..." : "Enviar enlace"}
                        </Button>
                    </form>
                    <div className="text-center mt-4">
                        <Link to="/" className="text-sm text-ring hover:underline">
                            Volver al login
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}