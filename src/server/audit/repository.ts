export interface NewAuditEvent {
  actorUserId: string | null;
  tenantId: string | null;
  action: string;
  subjectType: string;
  subjectId: string | null;
  requestId: string;
  metadata: Record<string, string | number | boolean | null>;
}

export interface AuditRepository {
  append(event: NewAuditEvent): Promise<void>;
}
