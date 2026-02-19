import { useCallback, useEffect, useState } from "react";

import { useAppData } from "../providers/AppDataProvider";
import type { AuthMeResponse } from "../types/user";

export function useUser() {
  const { userContext, setUserContext } = useAppData();
  const [loading, setLoading] = useState(false);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/me/", {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });
      if (!response.ok) {
        setUserContext(null);
        return null;
      }

      const data = (await response.json()) as AuthMeResponse;
      const next = data.authenticated ? data.user : null;
      setUserContext(next);
      return next;
    } catch {
      setUserContext(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [setUserContext]);

  useEffect(() => {
    if (userContext === null) {
      void refreshUser();
    }
  }, [refreshUser, userContext]);

  return {
    user: userContext,
    isAuthenticated: Boolean(userContext),
    loading,
    refreshUser,
  };
}
