import { User } from "lucide-react";
import { BaseLogin } from "./BaseLogin";

interface StudentLoginProps {
    onLogin: () => void;
    onBack: () => void;
}

export function StudentLogin({ onLogin, onBack }: StudentLoginProps) {
    return (
        <BaseLogin
            onLogin={onLogin}
            onBack={onBack}
            portal="student"
            subtitle="Portal del Estudiante"
            emailLabel="Correo Electrónico"
            emailId="email"
            passwordId="password"
            forgotPasswordText="¿Olvidaste tu contraseña?"
            buttonLoadingText="Iniciando sesión..."
            buttonIdleText={<><User className="mr-3 w-5 h-5" /> Iniciar Sesión</>}
            successMessage="¡Bienvenido a NexUS!"
            invalidCredentialsMessage="Credenciales inválidas"
        />
    );
}