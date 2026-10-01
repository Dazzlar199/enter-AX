export type TenantRole = "owner" | "admin" | "member" | "viewer";

export interface TenantMembership {
  tenantId: string;
  userId: string;
  role: TenantRole;
  status: "active" | "invited" | "suspended" | "revoked";
}

export interface TenancyRepository {
  findActiveMembership(userId: string, tenantId: string): Promise<TenantMembership | null>;
}
