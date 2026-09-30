"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { fetchAgencySession, loginAgency, logoutAgency, type AgencyProfile } from "./session-client";

const isApiMode = process.env.NEXT_PUBLIC_BACKEND_MODE === "api";

interface AgencySessionValue {
  profile: AgencyProfile | null;
  status: "loading" | "ready";
  login: (email: string, password: string) => Promise<AgencyProfile>;
  logout: () => Promise<void>;
}

const AgencySessionContext = createContext<AgencySessionValue | null>(null);

export function AgencySessionProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AgencyProfile | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">(isApiMode ? "loading" : "ready");

  useEffect(() => {
    if (!isApiMode) return;
    let cancelled = false;
    fetchAgencySession().then((result) => {
      if (!cancelled) {
        setProfile(result);
        setStatus("ready");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginAgency(email, password);
    setProfile(result);
    return result;
  }, []);

  const logout = useCallback(async () => {
    await logoutAgency();
    setProfile(null);
  }, []);

  return (
    <AgencySessionContext.Provider value={{ profile, status, login, logout }}>
      {children}
    </AgencySessionContext.Provider>
  );
}

export function useAgencySession(): AgencySessionValue {
  const context = useContext(AgencySessionContext);
  if (!context) throw new Error("useAgencySession must be used inside AgencySessionProvider");
  return context;
}
