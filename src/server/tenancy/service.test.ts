import { describe, expect, it } from "vitest";

import { MemoryPlatformRepository } from "@/server/testing/memory-platform";

import { TenancyService } from "./service";

describe("TenancyService", () => {
  it("returns an active membership with an allowed role", async () => {
    const repository = new MemoryPlatformRepository();
    repository.seedMembership({
      tenantId: "00000000-0000-4000-8000-000000000010",
      userId: "00000000-0000-4000-8000-000000000001",
      role: "owner",
      status: "active",
    });
    const service = new TenancyService(repository, repository);

    await expect(
      service.requireMembership(
        "00000000-0000-4000-8000-000000000001",
        "00000000-0000-4000-8000-000000000010",
        ["owner"],
        "req-1",
      ),
    ).resolves.toMatchObject({ role: "owner", status: "active" });
  });

  it("denies cross-tenant membership and audits only identifiers", async () => {
    const repository = new MemoryPlatformRepository();
    const service = new TenancyService(repository, repository);

    await expect(
      service.requireMembership(
        "00000000-0000-4000-8000-000000000001",
        "00000000-0000-4000-8000-000000000020",
        ["owner", "admin"],
        "req-2",
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(repository.auditEvents[0]).toMatchObject({
      action: "authorization.denied",
      actorUserId: "00000000-0000-4000-8000-000000000001",
      tenantId: "00000000-0000-4000-8000-000000000020",
      metadata: { requiredRoles: "owner,admin" },
    });
  });
});
