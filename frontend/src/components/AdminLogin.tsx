import { AlertCircle, Shield } from "lucide-react";
import { BaseLogin } from "./BaseLogin";

interface AdminLoginProps {
    onLogin: () => void;
    onBack: () => void;
}

export function AdminLogin({ onLogin, onBack }: AdminLoginProps) {
    return (
        <BaseLogin
            onLogin={onLogin}
            onBack={onBack}
            portal="admin"
            subtitle="Panel de Administración"
            emailLabel="Correo Administrativo"
            emailId="admin-email"
            passwordId="admin-password"
            forgotPasswordText="Recuperar acceso"
            buttonLoadingText="Verificando..."
            buttonIdleText={<><Shield className="mr-3 w-5 h-5" /> Acceder al Panel</>}
            successMessage="Acceso concedido"
            invalidCredentialsMessage="Credenciales inválidas o sin permisos"
            alertBanner={
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-xs text-orange-900 font-semibold">Acceso Restringido</p>
                        <p className="text-xs text-orange-700 mt-1">Este panel requiere credenciales administrativas. Todos los accesos son registrados.</p>
                    </div>
                </div>
            }
        />
    );
}