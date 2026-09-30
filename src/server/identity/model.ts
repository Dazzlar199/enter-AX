export interface CommunityViewer {
  userId: string;
  nickname: string;
}

export interface CommunitySession extends CommunityViewer {
  sessionId: string;
  expiresAt: string;
  revokedAt: string | null;
  userStatus: "active" | "suspended" | "deleted";
  profileStatus: "active" | "suspended" | "deleted";
}

export interface AgencySession {
  sessionId: string;
  userId: string;
  tenantId: string;
  email: string;
  displayName: string;
  expiresAt: string;
  revokedAt: string | null;
  userStatus: "active" | "suspended" | "deleted";
  profileStatus: "active" | "suspended" | "deleted";
}
