export interface AgencyProfile {
  email: string;
  displayName: string;
  tenantId: string;
  role: "owner" | "admin" | "member" | "viewer";
}

export class AgencySessionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = "AgencySessionError";
  }
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, credentials: "include" });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const error = body?.error;
    throw new AgencySessionError(error?.code ?? "UNKNOWN_ERROR", error?.message ?? "요청을 처리하지 못했습니다.", error?.requestId);
  }
  return body as T;
}

export async function fetchAgencySession(): Promise<AgencyProfile | null> {
  try {
    const response = await apiRequest<{ profile: AgencyProfile }>("/api/v1/agency/session");
    return response.profile;
  } catch (error) {
    if (error instanceof AgencySessionError && error.code === "UNAUTHENTICATED") return null;
    throw error;
  }
}

export async function loginAgency(email: string, password: string): Promise<AgencyProfile> {
  const response = await apiRequest<{ profile: AgencyProfile }>("/api/v1/agency/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return response.profile;
}

export async function logoutAgency(): Promise<void> {
  await apiRequest("/api/v1/agency/session", { method: "DELETE" });
}
