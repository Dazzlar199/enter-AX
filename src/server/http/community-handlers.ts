import { z } from "zod";

import { CommunityService } from "@/server/community/service";
import {
  createCommentSchema,
  createPostSchema,
  createProfileSchema,
  createReportSchema,
  listCommentsQuerySchema,
  listPostsQuerySchema,
} from "@/server/community/schema";
import { IdentityService } from "@/server/identity/service";
import { AppError } from "@/server/shared/errors";
import type { RateLimiter } from "@/server/shared/rate-limit";
import { assertSameOrigin, getRequestId } from "@/server/shared/request";

import { errorResponse, jsonResponse } from "./json";
import { buildSessionCookie, clientIp, readCookie, readJson } from "./request-context";

export const COMMUNITY_SESSION_COOKIE = "enter_ax_community_session";

export function createCommunityHandlers(dependencies: {
  identity: IdentityService;
  community: CommunityService;
  limiter: RateLimiter;
  appOrigin: string;
  secureCookies: boolean;
}) {
  const { identity, community, limiter, appOrigin, secureCookies } = dependencies;

  async function actorFor(request: Request) {
    return identity.resolveCommunitySession(readCookie(request, COMMUNITY_SESSION_COOKIE));
  }

  return {
    async postSession(request: Request) {
      const requestId = getRequestId(request);
      try {
        assertSameOrigin(request, appOrigin);
        await limiter.check({ key: `session:${clientIp(request)}`, limit: 5, windowMs: 60 * 60 * 1000 });
        const input = createProfileSchema.parse(await readJson(request));
        const created = await identity.createCommunitySession({ nickname: input.nickname, requestId });
        return jsonResponse(
          { profile: { nickname: created.session.nickname } },
          201,
          { "set-cookie": buildSessionCookie(COMMUNITY_SESSION_COOKIE, created.token, secureCookies), "x-request-id": requestId },
        );
      } catch (error) {
        return errorResponse(error, requestId);
      }
    },

    async getSession(request: Request) {
      const requestId = getRequestId(request);
      try {
        const actor = await actorFor(request);
        if (!actor) throw new AppError("UNAUTHENTICATED", "커뮤니티 로그인이 필요합니다.");
        return jsonResponse({ profile: { nickname: actor.nickname } }, 200, { "x-request-id": requestId });
      } catch (error) {
        return errorResponse(error, requestId);
      }
    },

    async deleteSession(request: Request) {
      const requestId = getRequestId(request);
      try {
        assertSameOrigin(request, appOrigin);
        const actor = await actorFor(request);
        if (!actor) throw new AppError("UNAUTHENTICATED", "커뮤니티 로그인이 필요합니다.");
        await identity.revokeCommunitySession(actor, requestId);
        return new Response(null, {
          status: 204,
          headers: { "set-cookie": buildSessionCookie(COMMUNITY_SESSION_COOKIE, "", secureCookies, 0), "x-request-id": requestId },
        });
      } catch (error) {
        return errorResponse(error, requestId);
      }
    },

    async getPosts(request: Request) {
      const requestId = getRequestId(request);
      try {
        const url = new URL(request.url);
        const input = listPostsQuerySchema.parse(Object.fromEntries(url.searchParams));
        const page = await community.listPosts(input);
        return jsonResponse(page, 200, { "x-request-id": requestId });
      } catch (error) {
        return errorResponse(error, requestId);
      }
    },

    async postPost(request: Request) {
      const requestId = getRequestId(request);
      try {
        assertSameOrigin(request, appOrigin);
        const actor = await actorFor(request);
        if (!actor) throw new AppError("UNAUTHENTICATED", "커뮤니티 로그인이 필요합니다.");
        await limiter.check({ key: `post:${actor.userId}`, limit: 10, windowMs: 60 * 60 * 1000 });
        const input = createPostSchema.parse(await readJson(request));
        const post = await community.createPost(actor, input, requestId);
        return jsonResponse({ post }, 201, { "x-request-id": requestId });
      } catch (error) {
        return errorResponse(error, requestId);
      }
    },

    async getComments(request: Request, postId: string) {
      const requestId = getRequestId(request);
      try {
        z.uuid().parse(postId);
        const url = new URL(request.url);
        const input = listCommentsQuerySchema.parse(Object.fromEntries(url.searchParams));
        const page = await community.listComments({ postId, ...input });
        return jsonResponse(page, 200, { "x-request-id": requestId });
      } catch (error) {
        return errorResponse(error, requestId);
      }
    },

    async postComment(request: Request, postId: string) {
      const requestId = getRequestId(request);
      try {
        assertSameOrigin(request, appOrigin);
        z.uuid().parse(postId);
        const actor = await actorFor(request);
        if (!actor) throw new AppError("UNAUTHENTICATED", "커뮤니티 로그인이 필요합니다.");
        await limiter.check({ key: `comment:${actor.userId}`, limit: 60, windowMs: 60 * 60 * 1000 });
        const input = createCommentSchema.parse(await readJson(request));
        const comment = await community.createComment(actor, postId, input, requestId);
        return jsonResponse({ comment }, 201, { "x-request-id": requestId });
      } catch (error) {
        return errorResponse(error, requestId);
      }
    },

    async postReport(request: Request) {
      const requestId = getRequestId(request);
      try {
        assertSameOrigin(request, appOrigin);
        const actor = await actorFor(request);
        if (!actor) throw new AppError("UNAUTHENTICATED", "커뮤니티 로그인이 필요합니다.");
        await limiter.check({ key: `report:${actor.userId}`, limit: 20, windowMs: 24 * 60 * 60 * 1000 });
        const input = createReportSchema.parse(await readJson(request));
        const report = await community.report(actor, input, requestId);
        return jsonResponse({ report }, 201, { "x-request-id": requestId });
      } catch (error) {
        return errorResponse(error, requestId);
      }
    },
  };
}
