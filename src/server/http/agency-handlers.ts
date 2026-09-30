import { agencyLoginSchema } from "@/server/identity/agency-schema";
import type { AgencySession } from "@/server/identity/model";
import { IdentityService } from "@/server/identity/service";
import { AppError } from "@/server/shared/errors";
import type { RateLimiter } from "@/server/shared/rate-limit";
import { assertSameOrigin, getRequestId } from "@/server/shared/request";
import { TenancyService } from "@/server/tenancy/service";

import { errorResponse, jsonResponse } from "./json";
import { buildSessionCookie, clientIp, readCookie, readJson } from "./request-context";

export const AGENCY_SESSION_COOKIE = "enter_ax_agency_session";
const ALL_ROLES = ["owner", "admin", "member", "viewer"] as const;

export function createAgencyHandlers(dependencies: {
  identity: IdentityService;
  tenancy: TenancyService;
  limiter: RateLimiter;
  appOrigin: string;
  secureCookies: boolean;
}) {
  const { identity, tenancy, limiter, appOrigin, secureCookies } = dependencies;

  async function actorFor(request: Request): Promise<AgencySession | null> {
    return identity.resolveAgencySession(readCookie(request, AGENCY_SESSION_COOKIE));
  }

  return {
    async postAgencySession(request: Request) {
      const requestId = getRequestId(request);
      try {
        assertSameOrigin(request, appOrigin);
        await limiter.check({ key: `agency-session:${clientIp(request)}`, limit: 10, windowMs: 60 * 60 * 1000 });
        const input = agencyLoginSchema.parse(await readJson(request));
        const result = await identity.authenticateAgency({ email: input.email, password: input.password, requestId });
        if (!result) throw new AppError("UNAUTHENTICATED", "이메일 또는 비밀번호가 올바르지 않습니다.");
        const membership = await tenancy.requireMembership(result.session.userId, result.session.tenantId, [...ALL_ROLES], requestId);
        return jsonResponse(
          { profile: { email: result.session.email, displayName: result.session.displayName, tenantId: result.session.tenantId, role: membership.role } },
          200,
          { "set-cookie": buildSessionCookie(AGENCY_SESSION_COOKIE, result.token, secureCookies), "x-request-id": requestId },
        );
      } catch (error) {
        return errorResponse(error, requestId);
      }
    },

    async getAgencySession(request: Request) {
      const requestId = getRequestId(request);
      try {
        const actor = await actorFor(request);
        if (!actor) throw new AppError("UNAUTHENTICATED", "기획사 로그인이 필요합니다.");
        const membership = await tenancy.requireMembership(actor.userId, actor.tenantId, [...ALL_ROLES], requestId);
        return jsonResponse(
          { profile: { email: actor.email, displayName: actor.displayName, tenantId: actor.tenantId, role: membership.role } },
          200,
          { "x-request-id": requestId },
        );
      } catch (error) {
        return errorResponse(error, requestId);
      }
    },

    async deleteAgencySession(request: Request) {
      const requestId = getRequestId(request);
      try {
        assertSameOrigin(request, appOrigin);
        const actor = await actorFor(request);
        if (!actor) throw new AppError("UNAUTHENTICATED", "기획사 로그인이 필요합니다.");
        await identity.revokeAgencySession(actor, requestId);
        return new Response(null, {
          status: 204,
          headers: { "set-cookie": buildSessionCookie(AGENCY_SESSION_COOKIE, "", secureCookies, 0), "x-request-id": requestId },
        });
      } catch (error) {
        return errorResponse(error, requestId);
      }
    },
  };
}
