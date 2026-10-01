import type { AuditRepository } from "@/server/audit/repository";
import { AppError } from "@/server/shared/errors";

import type { TenancyRepository, TenantRole } from "./repository";

export class TenancyService {
  constructor(
    private readonly tenancy: TenancyRepository,
    private readonly audit: AuditRepository,
  ) {}

  async requireMembership(
    userId: string,
    tenantId: string,
    allowedRoles: TenantRole[],
    requestId: string,
  ) {
    const membership = await this.tenancy.findActiveMembership(userId, tenantId);
    if (!membership || !allowedRoles.includes(membership.role)) {
      await this.audit.append({
        actorUserId: userId,
        tenantId,
        action: "authorization.denied",
        subjectType: "tenant",
        subjectId: tenantId,
        requestId,
        metadata: { requiredRoles: allowedRoles.join(",") },
      });
      throw new AppError("FORBIDDEN", "이 워크스페이스에 접근할 권한이 없습니다.");
    }
    return membership;
  }
}
