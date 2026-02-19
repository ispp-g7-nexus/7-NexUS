import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";

import { useTenant, useUser } from "../hooks";
import { loginWithPassword, logoutSession } from "../lib/auth";
import type { PortalType, UserContextData } from "../types/user";
import { AdminLogin } from "./components/AdminLogin";
import { AdminView } from "./components/AdminView";
import { CommunityRulesModal } from "./components/CommunityRulesModal";
import { LoginView } from "./components/LoginView";
import { StudentLogin } from "./components/StudentLogin";
import { StudentView } from "./components/StudentView";

function isAdminUser(user: UserContextData | null): boolean {
  if (!user) return false;
  return user.roles.includes("portfolio_admin") || user.roles.includes("residence_admin");
}

function isResidentUser(user: UserContextData | null): boolean {
  if (!user) return false;
  return user.roles.includes("resident");
}

function resolveDefaultDashboard(user: UserContextData | null): string {
  if (isAdminUser(user) && !isResidentUser(user)) {
    return "/dashboard/admin";
  }
  return "/dashboard";
}

interface ClientRedirectProps {
  to: string;
  replace?: boolean;
  fallback?: ReactNode;
}

function ClientRedirect({ to, replace = true, fallback = null }: ClientRedirectProps) {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(to, { replace });
  }, [navigate, replace, to]);

  return <>{fallback}</>;
}

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Cargando sesion...</div>
    </div>
  );
}

function LoginRoute() {
  const navigate = useNavigate();

  return (
    <LoginView
      onSelectRole={(role) => {
        if (role === "student") {
          navigate("/login/estudiante");
          return;
        }
        navigate("/login/admin");
      }}
    />
  );
}

interface StudentLoginRouteProps {
  onSubmitLogin: (portal: PortalType, payload: { email: string; password: string }) => Promise<{ ok: boolean; detail?: string }>;
}

function StudentLoginRoute({ onSubmitLogin }: StudentLoginRouteProps) {
  const navigate = useNavigate();
  const [showRulesModal, setShowRulesModal] = useState(false);

  return (
    <>
      <StudentLogin
        onLogin={async (payload) => {
          const result = await onSubmitLogin("student", payload);
          if (result.ok) {
            setShowRulesModal(true);
          }
          return result;
        }}
        onBack={() => navigate("/login")}
      />
      <CommunityRulesModal
        isOpen={showRulesModal}
        onAccept={() => {
          setShowRulesModal(false);
          navigate("/dashboard");
        }}
      />
    </>
  );
}

interface AdminLoginRouteProps {
  onSubmitLogin: (portal: PortalType, payload: { email: string; password: string }) => Promise<{ ok: boolean; detail?: string }>;
}

function AdminLoginRoute({ onSubmitLogin }: AdminLoginRouteProps) {
  const navigate = useNavigate();

  return (
    <AdminLogin
      onLogin={async (payload) => {
        const result = await onSubmitLogin("admin", payload);
        if (result.ok) {
          navigate("/dashboard/admin");
        }
        return result;
      }}
      onBack={() => navigate("/login")}
    />
  );
}

interface StudentPanelRouteProps {
  isAuthenticated: boolean;
  isLoading: boolean;
  onLogout: () => Promise<void>;
}

function StudentPanelRoute({ isAuthenticated, isLoading, onLogout }: StudentPanelRouteProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }
  if (!isAuthenticated) {
    return <ClientRedirect to="/login" fallback={<LoginRoute />} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <StudentView
        onLogout={() => {
          void onLogout().finally(() => {
            navigate("/login");
          });
        }}
      />
    </div>
  );
}

interface AdminPanelRouteProps {
  user: UserContextData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  onLogout: () => Promise<void>;
}

function AdminPanelRoute({ user, isAuthenticated, isLoading, onLogout }: AdminPanelRouteProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }
  if (!isAuthenticated) {
    return <ClientRedirect to="/login/admin" fallback={<LoginRoute />} />;
  }
  if (!isAdminUser(user)) {
    return <ClientRedirect to="/dashboard" fallback={<AuthLoadingScreen />} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <AdminView
        onLogout={() => {
          void onLogout().finally(() => {
            navigate("/login");
          });
        }}
      />
    </div>
  );
}

export default function App() {
  const { tenantContext, hasWhitelabel } = useTenant();
  const { user, isAuthenticated, loading, refreshUser } = useUser();

  const branding = tenantContext?.residence?.branding;
  const themeVars = useMemo(
    () =>
      ({
        "--primary": branding?.primary_color || "#1B5E20",
        "--accent": branding?.accent_color || "#7BD14F",
        "--ring": branding?.accent_color || "#35C759",
        "--sidebar-primary": branding?.primary_color || "#1B5E20",
      }) as CSSProperties,
    [branding]
  );

  const handleSubmitLogin = async (portal: PortalType, payload: { email: string; password: string }) => {
    const result = await loginWithPassword({
      portal,
      email: payload.email,
      password: payload.password,
    });

    if (result.ok) {
      await refreshUser();
    }

    return result;
  };

  const handleLogout = async () => {
    await logoutSession();
    await refreshUser();
  };

  return (
    <div
      style={themeVars}
      data-tenant-domain={tenantContext?.domain || ""}
      data-tenant-id={tenantContext?.tenant.id || ""}
      data-user-id={user?.id || ""}
      data-whitelabel={hasWhitelabel ? "true" : "false"}
    >
      <Toaster position="top-center" richColors />
      <Routes>
        <Route path="/" element={<LoginRoute />} />

        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <ClientRedirect to={resolveDefaultDashboard(user)} fallback={<AuthLoadingScreen />} />
            ) : (
              <LoginRoute />
            )
          }
        />
        <Route
          path="/login/estudiante"
          element={
            isAuthenticated ? (
              <ClientRedirect to="/dashboard" fallback={<AuthLoadingScreen />} />
            ) : (
              <StudentLoginRoute onSubmitLogin={handleSubmitLogin} />
            )
          }
        />
        <Route
          path="/login/admin"
          element={
            isAuthenticated && isAdminUser(user) ? (
              <ClientRedirect to="/dashboard/admin" fallback={<AuthLoadingScreen />} />
            ) : (
              <AdminLoginRoute onSubmitLogin={handleSubmitLogin} />
            )
          }
        />

        <Route
          path="/dashboard/*"
          element={
            <StudentPanelRoute
              isAuthenticated={isAuthenticated}
              isLoading={loading}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/dashboard/admin/*"
          element={
            <AdminPanelRoute
              user={user}
              isAuthenticated={isAuthenticated}
              isLoading={loading}
              onLogout={handleLogout}
            />
          }
        />

        <Route path="*" element={<LoginRoute />} />
      </Routes>
    </div>
  );
}
