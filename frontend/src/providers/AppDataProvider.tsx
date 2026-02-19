import { createContext, useContext, useMemo, useState } from "react";

import type { AppBootstrapData } from "../types/app";
import type { TenantContextPayload } from "../types/tenant";
import type { UserContextData } from "../types/user";

interface AppDataContextValue extends AppBootstrapData {
  setTenantContext: (value: TenantContextPayload | null) => void;
  setUserContext: (value: UserContextData | null) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

interface AppDataProviderProps {
  initialData: AppBootstrapData;
  children: React.ReactNode;
}

export function AppDataProvider({ initialData, children }: AppDataProviderProps) {
  const [tenantContext, setTenantContext] = useState<TenantContextPayload | null>(initialData.tenantContext);
  const [userContext, setUserContext] = useState<UserContextData | null>(initialData.userContext);

  const value = useMemo<AppDataContextValue>(
    () => ({
      tenantContext,
      userContext,
      requestHost: initialData.requestHost,
      protocol: initialData.protocol,
      setTenantContext,
      setUserContext,
    }),
    [tenantContext, userContext, initialData.requestHost, initialData.protocol]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData debe usarse dentro de AppDataProvider");
  }

  return context;
}
