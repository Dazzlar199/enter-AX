# Community and Enterprise Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a PostgreSQL-backed, tenant-aware community backend with secure pseudonymous sessions, posts, comments, reports, audit events, and an API-connected community UI while preserving demo mode.

**Architecture:** Keep the existing Next.js deployment as a modular monolith. Route handlers delegate to framework-independent HTTP handlers, services depend on repository interfaces, and PostgreSQL adapters enforce application authorization plus forced RLS. The current local demo remains available behind a community client adapter.

**Tech Stack:** Next.js 15.5, React 19, TypeScript 5, PostgreSQL 17, `postgres` SQL client, Zod, Vitest, Testing Library, Docker Compose

**Spec:** `docs/superpowers/specs/2026-09-18-community-enterprise-backend-foundation-design.md`

## Global Constraints

- Preserve the existing Next.js App Router deployment and React 19 UI.
- Do not implement media workers, OAuth providers, audition applications, offers, or Hermes execution in this slice.
- Community identity must remain separate from future audition identity and must not be visible to tenant members.
- Production PostgreSQL access must use a non-owner role without `BYPASSRLS`; protected tables must use forced RLS.
- Use UUID primary keys and UTC `timestamptz` values.
- Store only SHA-256 hashes of opaque session tokens.
- Server-rendered community content remains plain text; do not interpret user content as HTML.
- Do not log session tokens, post bodies, comment bodies, or report reasons.
- Every production behavior is introduced through a failing test first.
- Preserve unrelated changes already present in the working tree.

---

## Planned File Structure

### Database and configuration

- `compose.yaml`: local PostgreSQL service and health check.
- `db/init/001-roles.sql`: local migration and runtime roles.
- `db/migrations/001_backend_foundation.sql`: tables, constraints, indexes, functions, grants, and RLS policies.
- `scripts/db-migrate.mjs`: ordered migration runner with a migrations ledger and transaction per file.
- `src/server/config.ts`: validated server environment.
- `src/server/db/client.ts`: owner/runtime PostgreSQL connection factories.
- `src/server/db/context.ts`: transaction-scoped `app.user_id` and `app.tenant_id` settings.

### Shared server contracts

- `src/server/shared/errors.ts`: typed application errors and HTTP mapping.
- `src/server/shared/page.ts`: opaque cursor encoding/decoding and `Page<T>`.
- `src/server/shared/request.ts`: request ID and same-origin checks.
- `src/server/shared/rate-limit.ts`: rate-limit interface and development in-memory adapter.

### Identity, community, tenancy, and audit

- `src/server/identity/model.ts`: actor and session types.
- `src/server/identity/repository.ts`: session persistence interface.
- `src/server/identity/token.ts`: opaque token generation and hashing.
- `src/server/identity/service.ts`: create, resolve, and revoke session use cases.
- `src/server/community/model.ts`: community domain records and category mapping.
- `src/server/community/schema.ts`: Zod inputs and limits.
- `src/server/community/repository.ts`: community persistence interface.
- `src/server/community/service.ts`: list/create/report use cases.
- `src/server/tenancy/repository.ts`: membership persistence interface.
- `src/server/tenancy/service.ts`: active membership and role resolution.
- `src/server/audit/repository.ts`: append-only audit interface.
- `src/server/testing/memory-platform.ts`: deterministic in-memory implementation for unit and route tests.
- `src/server/postgres/platform-repository.ts`: PostgreSQL implementation of all repository ports.

### HTTP and composition

- `src/server/http/json.ts`: success/error response helpers.
- `src/server/http/community-handlers.ts`: dependency-injected framework-independent handlers.
- `src/server/container.ts`: production dependency composition.
- `src/app/api/v1/community/session/route.ts`: session route delegate.
- `src/app/api/v1/community/posts/route.ts`: post route delegate.
- `src/app/api/v1/community/posts/[postId]/comments/route.ts`: comment route delegate.
- `src/app/api/v1/community/reports/route.ts`: report route delegate.

### Browser client and UI

- `src/features/community/client.ts`: shared browser client contract.
- `src/features/community/api-client.ts`: v1 API adapter.
- `src/features/community/demo-client.ts`: adapter around existing demo callbacks.
- `src/features/community/useCommunity.ts`: loading, session, post, comment, and error state.
- `src/components/talent/CommunityBoard.tsx`: remove client-controlled authors in API mode and add status UI.
- `src/app/talent/page.tsx`: select API or demo community adapter.

---

### Task 1: Local PostgreSQL, migrations, and forced RLS

**Files:**
- Create: `compose.yaml`
- Create: `db/init/001-roles.sql`
- Create: `db/migrations/001_backend_foundation.sql`
- Create: `scripts/db-migrate.mjs`
- Create: `src/server/db/schema.integration.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `DATABASE_URL` for the migration owner and `TEST_DATABASE_URL` for the runtime integration test.
- Produces: `npm run db:up`, `npm run db:migrate`, `npm run db:down`; the tables and RLS policies defined by the spec.

- [ ] **Step 1: Add database dependencies and scripts**

Run:

```bash
npm install postgres zod
```

Add scripts to `package.json`:

```json
"db:up": "docker compose up -d postgres",
"db:down": "docker compose down",
"db:migrate": "node scripts/db-migrate.mjs"
```

- [ ] **Step 2: Add a failing PostgreSQL schema test**

Create `src/server/db/schema.integration.test.ts` so it skips only when `TEST_DATABASE_URL` is absent and otherwise verifies:

```ts
expect(tables).toEqual(expect.arrayContaining([
  "users",
  "sessions",
  "community_profiles",
  "community_posts",
  "community_comments",
  "community_reports",
  "tenants",
  "tenant_memberships",
  "audit_events",
  "rate_limit_buckets",
]));
expect(forcedRlsTables).toEqual(expect.arrayContaining([
  "sessions",
  "community_profiles",
  "community_posts",
  "community_comments",
  "community_reports",
  "tenant_memberships",
  "audit_events",
]));
```

The test must also connect as the runtime user, set `app.user_id`, insert one user's post, change to a second user, and verify the second user cannot update the first user's post.

- [ ] **Step 3: Start PostgreSQL and verify the schema test fails**

Run:

```bash
npm run db:up
TEST_DATABASE_URL=postgres://enter_ax_app:enter_ax_app@localhost:54329/enter_ax_test npm test -- src/server/db/schema.integration.test.ts
```

Expected: FAIL because the required relations do not exist.

- [ ] **Step 4: Implement roles, schema, migration runner, grants, and RLS**

`compose.yaml` must expose PostgreSQL only on `127.0.0.1:54329`, use PostgreSQL 17, mount `db/init`, and include a `pg_isready` health check.

`001-roles.sql` must create login roles `enter_ax_owner` and `enter_ax_app`, create `enter_ax_test` owned by `enter_ax_owner`, and grant database connect to `enter_ax_app`.

`001_backend_foundation.sql` must:

- enable `pgcrypto`;
- create the ten tables from the spec with check constraints;
- create stable created-at and pagination indexes;
- create unique partial indexes for active nickname and open report uniqueness;
- create `lookup_session(text)` as a narrowly scoped `SECURITY DEFINER` function returning only session ID, user ID, expiry, revocation, user status, profile nickname, and profile status;
- revoke direct session table selection from the runtime role and grant only function execution;
- enable and force RLS on every protected table;
- define author ownership, published-read, current-user membership, and append-only audit policies;
- grant the minimum table and sequence privileges to `enter_ax_app`.

The migration runner must create `schema_migrations(filename text primary key, applied_at timestamptz not null default now())`, sort `.sql` files, and apply each unapplied migration in a transaction.

- [ ] **Step 5: Apply migrations and verify the PostgreSQL test passes**

Run:

```bash
DATABASE_URL=postgres://enter_ax_owner:enter_ax_owner@localhost:54329/enter_ax_test npm run db:migrate
TEST_DATABASE_URL=postgres://enter_ax_app:enter_ax_app@localhost:54329/enter_ax_test npm test -- src/server/db/schema.integration.test.ts
```

Expected: PASS with no authorization leak.

- [ ] **Step 6: Commit the database foundation**

```bash
git add compose.yaml db scripts/db-migrate.mjs src/server/db/schema.integration.test.ts package.json package-lock.json .gitignore
git commit -m "feat: add PostgreSQL backend foundation"
```

---

### Task 2: Shared errors, cursors, validation, and repository ports

**Files:**
- Create: `src/server/shared/errors.ts`
- Create: `src/server/shared/errors.test.ts`
- Create: `src/server/shared/page.ts`
- Create: `src/server/shared/page.test.ts`
- Create: `src/server/community/model.ts`
- Create: `src/server/community/schema.ts`
- Create: `src/server/community/schema.test.ts`
- Create: `src/server/community/repository.ts`
- Create: `src/server/identity/model.ts`
- Create: `src/server/identity/repository.ts`
- Create: `src/server/tenancy/repository.ts`
- Create: `src/server/audit/repository.ts`

**Interfaces:**
- Consumes: Zod.
- Produces: `AppError`, `toErrorPayload`, `encodeCursor`, `decodeCursor`, `Page<T>`, domain records, validation schemas, and repository interfaces used by every later task.

- [ ] **Step 1: Write failing tests for error mapping and cursors**

Test these exact behaviors:

```ts
expect(toErrorPayload(new AppError("UNAUTHENTICATED", "로그인이 필요합니다."), "req-1")).toEqual({
  status: 401,
  body: { error: { code: "UNAUTHENTICATED", message: "로그인이 필요합니다.", requestId: "req-1" } },
});

const encoded = encodeCursor({ createdAt: "2026-09-18T00:00:00.000Z", id: "00000000-0000-4000-8000-000000000001" });
expect(decodeCursor(encoded)).toEqual({ createdAt: "2026-09-18T00:00:00.000Z", id: "00000000-0000-4000-8000-000000000001" });
expect(() => decodeCursor("not-a-cursor")).toThrowError(AppError);
```

- [ ] **Step 2: Run the shared tests and verify they fail**

Run:

```bash
npm test -- src/server/shared/errors.test.ts src/server/shared/page.test.ts
```

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement shared errors and cursor helpers**

`AppError` codes and statuses must be:

```ts
type AppErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";
```

Map them to `400`, `401`, `403`, `404`, `409`, `429`, and `500`. Cursor payloads contain only `{ createdAt, id }`, use base64url JSON, and reject invalid timestamps or UUIDs.

- [ ] **Step 4: Write failing validation tests**

Cover the exact accepted categories and boundaries:

```ts
expect(createProfileSchema.parse({ nickname: "루아" })).toEqual({ nickname: "루아" });
expect(createProfileSchema.safeParse({ nickname: "a" }).success).toBe(false);
expect(createPostSchema.safeParse({ category: "unknown", title: "제목", body: "본문" }).success).toBe(false);
expect(createPostSchema.safeParse({ category: "question", title: "x".repeat(121), body: "본문" }).success).toBe(false);
expect(createCommentSchema.safeParse({ body: "" }).success).toBe(false);
expect(listPostsQuerySchema.parse({ limit: "999" }).limit).toBe(50);
```

- [ ] **Step 5: Run the validation test and verify it fails**

Run:

```bash
npm test -- src/server/community/schema.test.ts
```

Expected: FAIL because the schemas do not exist.

- [ ] **Step 6: Implement domain records, schemas, and repository ports**

Define repository methods with these signatures:

```ts
interface IdentityRepository {
  createCommunityIdentity(input: { nickname: string; tokenHash: string; expiresAt: string }): Promise<CommunitySession>;
  findSessionByTokenHash(tokenHash: string): Promise<CommunitySession | null>;
  revokeSession(sessionId: string, userId: string): Promise<void>;
}

interface CommunityRepository {
  listPosts(input: ListPostsInput): Promise<Page<CommunityPost>>;
  createPost(input: CreatePostRecord): Promise<CommunityPost>;
  listComments(input: ListCommentsInput): Promise<Page<CommunityComment>>;
  createComment(input: CreateCommentRecord): Promise<CommunityComment>;
  findPublishedTarget(input: ReportTarget): Promise<{ id: string; type: "post" | "comment" } | null>;
  createReport(input: CreateReportRecord): Promise<CommunityReport>;
}

interface TenancyRepository {
  findActiveMembership(userId: string, tenantId: string): Promise<TenantMembership | null>;
}

interface AuditRepository {
  append(event: NewAuditEvent): Promise<void>;
}
```

Use Korean display labels only at the UI boundary; persistence categories remain English slugs.

- [ ] **Step 7: Run all Task 2 tests and commit**

Run:

```bash
npm test -- src/server/shared/errors.test.ts src/server/shared/page.test.ts src/server/community/schema.test.ts
```

Expected: PASS.

```bash
git add src/server/shared src/server/community src/server/identity src/server/tenancy src/server/audit
git commit -m "feat: define backend domain contracts"
```

---

### Task 3: In-memory platform and community/session services

**Files:**
- Create: `src/server/testing/memory-platform.ts`
- Create: `src/server/identity/token.ts`
- Create: `src/server/identity/token.test.ts`
- Create: `src/server/identity/service.ts`
- Create: `src/server/identity/service.test.ts`
- Create: `src/server/community/service.ts`
- Create: `src/server/community/service.test.ts`

**Interfaces:**
- Consumes: repository ports and validation outputs from Task 2.
- Produces: `MemoryPlatformRepository`, `IdentityService`, `CommunityService`, `generateSessionToken`, and `hashSessionToken`.

- [ ] **Step 1: Write failing token tests**

```ts
const token = generateSessionToken();
expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
expect(hashSessionToken("same-token")).toBe(hashSessionToken("same-token"));
expect(hashSessionToken("same-token")).not.toBe(hashSessionToken("other-token"));
expect(hashSessionToken("same-token")).not.toContain("same-token");
```

- [ ] **Step 2: Verify token tests fail, implement, and verify green**

Run before and after implementation:

```bash
npm test -- src/server/identity/token.test.ts
```

Use `randomBytes(32).toString("base64url")` and SHA-256 hexadecimal hashing.

- [ ] **Step 3: Write failing identity service tests**

Tests must inject a deterministic clock and token generator and verify:

- session expiry is exactly 30 days after creation;
- repository receives only the hash, never the raw token;
- expired, revoked, inactive-user, and inactive-profile sessions resolve to `null`;
- revocation calls the repository with both session ID and user ID;
- `community.session.created` audit metadata contains no token or nickname.

- [ ] **Step 4: Run identity tests and verify expected failures**

Run:

```bash
npm test -- src/server/identity/service.test.ts
```

Expected: FAIL because `IdentityService` does not exist.

- [ ] **Step 5: Implement the memory repository and identity service**

`MemoryPlatformRepository` must implement all four repository ports, generate deterministic UUID-shaped IDs for tests, enforce unique active nicknames, order posts/comments by `(createdAt DESC, id DESC)`, and enforce one open report per reporter and target.

`IdentityService` public methods:

```ts
createCommunitySession(input: { nickname: string; requestId: string }): Promise<{ token: string; session: CommunitySession }>;
resolveCommunitySession(rawToken: string | undefined): Promise<CommunitySession | null>;
revokeCommunitySession(session: CommunitySession, requestId: string): Promise<void>;
```

- [ ] **Step 6: Write failing community service tests**

Cover:

- published posts only, category filtering, stable cursor pagination;
- author identity comes from `CommunitySession`, never input;
- missing session throws `UNAUTHENTICATED`;
- comments reject missing/removed posts;
- a report rejects a missing target;
- duplicate open reports throw `CONFLICT`;
- audit metadata contains target IDs and categories but no title, body, or reason.

- [ ] **Step 7: Run community tests and verify expected failures**

Run:

```bash
npm test -- src/server/community/service.test.ts
```

Expected: FAIL because `CommunityService` does not exist.

- [ ] **Step 8: Implement the community service and verify Task 3**

Public methods:

```ts
listPosts(input: ListPostsInput): Promise<Page<CommunityPost>>;
createPost(actor: CommunitySession | null, input: CreatePostInput, requestId: string): Promise<CommunityPost>;
listComments(input: ListCommentsInput): Promise<Page<CommunityComment>>;
createComment(actor: CommunitySession | null, postId: string, input: CreateCommentInput, requestId: string): Promise<CommunityComment>;
report(actor: CommunitySession | null, input: CreateReportInput, requestId: string): Promise<CommunityReport>;
```

Run:

```bash
npm test -- src/server/identity src/server/community src/server/shared
```

Expected: PASS.

- [ ] **Step 9: Commit services**

```bash
git add src/server/testing src/server/identity src/server/community
git commit -m "feat: add community and session services"
```

---

### Task 4: Tenancy resolution and security request utilities

**Files:**
- Create: `src/server/tenancy/service.ts`
- Create: `src/server/tenancy/service.test.ts`
- Create: `src/server/shared/request.ts`
- Create: `src/server/shared/request.test.ts`
- Create: `src/server/shared/rate-limit.ts`
- Create: `src/server/shared/rate-limit.test.ts`

**Interfaces:**
- Consumes: `TenancyRepository`, `AppError`, and request actor types.
- Produces: `TenancyService.requireMembership`, `getRequestId`, `assertSameOrigin`, `RateLimiter`, and `MemoryRateLimiter`.

- [ ] **Step 1: Write failing tenancy tests**

```ts
await expect(service.requireMembership("user-1", "tenant-2", ["owner", "admin"])).rejects.toMatchObject({ code: "FORBIDDEN" });
await expect(service.requireMembership("user-1", "tenant-1", ["owner"])).resolves.toMatchObject({ role: "owner", status: "active" });
```

Also verify missing and inactive memberships are denied and create an `authorization.denied` audit event without tenant data beyond IDs and the required roles.

- [ ] **Step 2: Verify tenancy tests fail, implement, and verify green**

Run before and after implementation:

```bash
npm test -- src/server/tenancy/service.test.ts
```

- [ ] **Step 3: Write failing request and limiter tests**

Cover:

- an existing `x-request-id` containing only `[A-Za-z0-9._-]` and at most 100 characters is preserved;
- any other request ID is replaced with a UUID;
- mutation with a matching configured origin passes;
- missing or mismatched `Origin` throws `FORBIDDEN` outside test mode;
- `MemoryRateLimiter` allows `limit` hits inside a window, rejects the next hit with `RATE_LIMITED`, and permits hits after the injected clock advances.

- [ ] **Step 4: Verify failures, implement utilities, and verify green**

Run before and after implementation:

```bash
npm test -- src/server/shared/request.test.ts src/server/shared/rate-limit.test.ts
```

`RateLimiter` exposes:

```ts
check(input: { key: string; limit: number; windowMs: number }): Promise<void>;
```

- [ ] **Step 5: Commit tenancy and request security**

```bash
git add src/server/tenancy src/server/shared/request.ts src/server/shared/request.test.ts src/server/shared/rate-limit.ts src/server/shared/rate-limit.test.ts
git commit -m "feat: add tenant authorization guards"
```

---

### Task 5: HTTP handlers and cookie session behavior

**Files:**
- Create: `src/server/http/json.ts`
- Create: `src/server/http/community-handlers.ts`
- Create: `src/server/http/community-handlers.test.ts`

**Interfaces:**
- Consumes: `IdentityService`, `CommunityService`, `RateLimiter`, request utilities, and Zod schemas.
- Produces: `createCommunityHandlers(deps)` with `getSession`, `postSession`, `deleteSession`, `getPosts`, `postPost`, `getComments`, `postComment`, and `postReport` functions accepting standard `Request` objects.

- [ ] **Step 1: Write failing handler tests for sessions**

Verify:

- `POST /session` returns `201`, a public profile, and `Set-Cookie` containing `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Max-Age=2592000`;
- the cookie contains the raw token but the response body does not;
- `GET /session` returns `401` without the cookie;
- `DELETE /session` revokes and returns a clearing cookie;
- invalid nickname produces the documented `400` error shape with `requestId` and field errors;
- session creation uses rate-limit key `session:<client-ip>`.

- [ ] **Step 2: Run session handler tests and verify failures**

Run:

```bash
npm test -- src/server/http/community-handlers.test.ts
```

Expected: FAIL because the handler factory does not exist.

- [ ] **Step 3: Implement JSON helpers and session handlers**

Use cookie name `enter_ax_community_session`. Parse cookies without adding another dependency. Set `Secure` from injected configuration, never from a request header.

- [ ] **Step 4: Add failing handler tests for posts, comments, and reports**

Verify:

- list routes do not require a session;
- writes require a session and matching origin;
- request bodies cannot set `authorName` or `authorUserId` because schemas strip or reject unknown keys;
- creation returns `201`;
- missing post returns `404`;
- duplicate report returns `409`;
- pagination returns `{ items, nextCursor }`;
- unexpected errors return `500` without exposing the thrown message.

- [ ] **Step 5: Run handler tests to verify the new cases fail**

Run:

```bash
npm test -- src/server/http/community-handlers.test.ts
```

Expected: FAIL on the unimplemented community handlers.

- [ ] **Step 6: Implement all community handlers and verify green**

Write handlers as dependency-injected functions; do not import PostgreSQL or global configuration in this file. Use mutation limits of 5 session creations/IP/hour, 10 posts/user/hour, 60 comments/user/hour, and 20 reports/user/day.

Run:

```bash
npm test -- src/server/http/community-handlers.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit HTTP handlers**

```bash
git add src/server/http
git commit -m "feat: add community HTTP handlers"
```

---

### Task 6: PostgreSQL repository and repository contract suite

**Files:**
- Create: `src/server/db/client.ts`
- Create: `src/server/db/context.ts`
- Create: `src/server/config.ts`
- Create: `src/server/postgres/platform-repository.ts`
- Create: `src/server/postgres/rate-limit.ts`
- Create: `src/server/postgres/rate-limit.integration.test.ts`
- Create: `src/server/community/repository.contract.ts`
- Create: `src/server/community/memory-repository.test.ts`
- Create: `src/server/community/postgres-repository.integration.test.ts`

**Interfaces:**
- Consumes: repository ports from Task 2 and migrated schema from Task 1.
- Produces: `PostgresPlatformRepository`, `PostgresRateLimiter`, `createRuntimeSql`, `withActorTransaction`, and a reusable `communityRepositoryContract(name, factory)`.

- [ ] **Step 1: Write the repository contract and run it against memory**

The contract must verify:

- create/list posts includes the author's nickname but not user ID;
- category filtering;
- stable descending cursor pagination with no duplicate rows;
- comments require a published post;
- removed posts and comments are absent from reader queries;
- duplicate open report enforcement;
- report targets support posts and comments.

Run:

```bash
npm test -- src/server/community/memory-repository.test.ts
```

Expected: PASS against the already-tested memory adapter. If it fails, correct the adapter without weakening contract assertions.

- [ ] **Step 2: Add the PostgreSQL contract test and verify it fails**

The integration test must skip only without `TEST_DATABASE_URL`, clean test-owned rows between cases, and construct `PostgresPlatformRepository` with the runtime client.

Run:

```bash
TEST_DATABASE_URL=postgres://enter_ax_app:enter_ax_app@localhost:54329/enter_ax_test npm test -- src/server/community/postgres-repository.integration.test.ts
```

Expected: FAIL because `PostgresPlatformRepository` does not exist.

- [ ] **Step 3: Write failing configuration and actor transaction tests**

Verify configuration rejects API mode without `DATABASE_URL`, rejects production API mode without secure cookies, and accepts demo mode without server credentials. Verify `withActorTransaction` calls `set_config('app.user_id', ..., true)` and `set_config('app.tenant_id', ..., true)` inside the same transaction used for queries.

Add `src/server/postgres/rate-limit.integration.test.ts` and verify two independently constructed limiter instances share the same PostgreSQL count, the request at `limit + 1` throws `RATE_LIMITED`, raw rate-limit keys never appear in `rate_limit_buckets`, and an injected clock advancing into a new fixed window allows traffic again.

- [ ] **Step 4: Implement configuration, database context, and PostgreSQL repository**

Requirements:

- use `postgres` tagged-template parameters only;
- use the session lookup function rather than direct session table selection;
- wrap author and tenant mutations in `withActorTransaction`;
- translate PostgreSQL unique violations for nickname and open report into `CONFLICT`;
- compare UUIDs and timestamps as strings at the domain boundary;
- never return author user IDs in public community records.

`PostgresRateLimiter.check` must hash the supplied key with SHA-256, atomically insert or increment the row for the current fixed window, return `RATE_LIMITED` when the incremented count exceeds the limit, and opportunistically delete expired buckets without storing raw IP addresses or user IDs.

- [ ] **Step 5: Verify PostgreSQL contracts and all repository tests**

Run:

```bash
TEST_DATABASE_URL=postgres://enter_ax_app:enter_ax_app@localhost:54329/enter_ax_test npm test -- src/server/community/memory-repository.test.ts src/server/community/postgres-repository.integration.test.ts src/server/postgres/rate-limit.integration.test.ts src/server/db/schema.integration.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit PostgreSQL adapters**

```bash
git add src/server/config.ts src/server/db src/server/postgres src/server/community/repository.contract.ts src/server/community/memory-repository.test.ts src/server/community/postgres-repository.integration.test.ts
git commit -m "feat: implement PostgreSQL repository adapters"
```

---

### Task 7: Production container and Next.js route delegates

**Files:**
- Create: `src/server/container.ts`
- Create: `src/server/container.test.ts`
- Create: `src/app/api/v1/community/session/route.ts`
- Create: `src/app/api/v1/community/posts/route.ts`
- Create: `src/app/api/v1/community/posts/[postId]/comments/route.ts`
- Create: `src/app/api/v1/community/reports/route.ts`
- Create: `src/app/api/v1/community/routes.test.ts`

**Interfaces:**
- Consumes: configuration, PostgreSQL repository, services, rate limiter, and handler factory.
- Produces: lazy `getServerContainer()` and deployed App Router endpoints.

- [ ] **Step 1: Write failing container tests**

Verify:

- demo mode does not instantiate PostgreSQL;
- API mode creates one cached runtime SQL client and one handler set;
- production API mode selects `PostgresRateLimiter` and never the in-memory limiter;
- test dependency factories can be injected without reading process environment.

- [ ] **Step 2: Run container tests and verify failure**

Run:

```bash
npm test -- src/server/container.test.ts
```

Expected: FAIL because the container does not exist.

- [ ] **Step 3: Implement a lazy server container**

Do not open a database connection during module import. `getServerContainer()` initializes on first route call and caches only production dependencies. Use `PostgresRateLimiter` in API mode and `MemoryRateLimiter` only in injected tests.

- [ ] **Step 4: Write failing route delegate tests**

Import each route module with a test container and verify HTTP method wiring and dynamic `postId` propagation. Tests must call the exported Next.js route functions with standard `Request` objects.

- [ ] **Step 5: Run route tests and verify failure**

Run:

```bash
npm test -- src/app/api/v1/community/routes.test.ts
```

Expected: FAIL because route files do not exist.

- [ ] **Step 6: Implement route delegates and verify green**

Each route file contains only runtime declaration, handler lookup, and method delegation. Set `runtime = "nodejs"` and do not duplicate validation or business logic.

Run:

```bash
npm test -- src/server/container.test.ts src/app/api/v1/community/routes.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit route composition**

```bash
git add src/server/container.ts src/server/container.test.ts src/app/api/v1/community
git commit -m "feat: expose community API routes"
```

---

### Task 8: Community browser adapters and UI integration

**Files:**
- Create: `src/features/community/client.ts`
- Create: `src/features/community/api-client.ts`
- Create: `src/features/community/api-client.test.ts`
- Create: `src/features/community/demo-client.ts`
- Create: `src/features/community/useCommunity.ts`
- Create: `src/features/community/useCommunity.test.tsx`
- Modify: `src/components/talent/CommunityBoard.tsx`
- Modify: `src/app/talent/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/types/domain.ts`
- Test: `src/components/talent/CommunityBoard.test.tsx`
- Test: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: v1 API response shapes and existing demo repository callbacks.
- Produces: `CommunityClient`, `ApiCommunityClient`, `createDemoCommunityClient`, and `useCommunity`.

- [ ] **Step 1: Write failing API client tests**

Verify:

- `listPosts` maps English API categories to the existing Korean display categories;
- `createSession` sends only `{ nickname }` with credentials included;
- `createPost` sends only `{ category, title, body }`;
- `createComment` sends only `{ body }`;
- non-2xx responses throw `CommunityClientError` carrying code, message, request ID, and field errors.

- [ ] **Step 2: Run API client tests and verify failure**

Run:

```bash
npm test -- src/features/community/api-client.test.ts
```

Expected: FAIL because the client does not exist.

- [ ] **Step 3: Implement the community client contract and adapters**

Use these client methods:

```ts
getSession(): Promise<CommunityViewer | null>;
createSession(nickname: string): Promise<CommunityViewer>;
listPosts(): Promise<CommunityPost[]>;
createPost(input: { category: CommunityCategory; title: string; body: string }): Promise<CommunityPost>;
createComment(postId: string, body: string): Promise<CommunityReply>;
report(input: { targetType: "post" | "comment"; targetId: string; reason: string }): Promise<void>;
```

The demo adapter may accept the existing callbacks internally but must satisfy the same outward contract.

- [ ] **Step 4: Write failing hook and UI tests**

Cover:

- API mode initially renders loading state then posts;
- load failure renders a retry action;
- first write without a session asks for one nickname and creates the session before retrying the write;
- post and comment forms do not contain author-name inputs after a session exists;
- successful writes update visible state without a page reload;
- demo mode still creates posts and replies through the demo callbacks.

- [ ] **Step 5: Run hook/UI tests and verify failures**

Run:

```bash
npm test -- src/features/community/useCommunity.test.tsx src/components/talent/CommunityBoard.test.tsx
```

Expected: FAIL on missing hook/client-driven UI behavior.

- [ ] **Step 6: Implement the hook and component integration**

`NEXT_PUBLIC_BACKEND_MODE` accepts only `demo` or `api` and defaults to `demo`. Preserve the existing talent spotlight and agency sections. Add accessible loading, error, retry, and session nickname UI; keep all visible Korean copy consistent with the current page.

- [ ] **Step 7: Verify community UI and existing page tests**

Run:

```bash
npm test -- src/features/community src/components/talent/CommunityBoard.test.tsx src/app/page.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit browser integration**

```bash
git add src/features/community src/components/talent/CommunityBoard.tsx src/components/talent/CommunityBoard.test.tsx src/app/talent/page.tsx src/app/globals.css src/types/domain.ts src/app/page.test.tsx
git commit -m "feat: connect community UI to backend API"
```

---

### Task 9: Operator documentation and complete verification

**Files:**
- Create: `.env.example`
- Create: `docs/backend-foundation.md`
- Modify: `README.md`
- Modify: `vercel.json`
- Modify: `next.config.js`
- Delete: `next.config.ts`

**Interfaces:**
- Consumes: all implemented commands, environment variables, and rollout rules.
- Produces: one authoritative Next.js configuration and an operator runbook.

- [ ] **Step 1: Write the configuration documentation**

`.env.example` must document without real secrets:

```dotenv
NEXT_PUBLIC_BACKEND_MODE=demo
DATABASE_URL=postgres://enter_ax_app:change-me@localhost:54329/enter_ax_test
SESSION_COOKIE_SECURE=false
APP_ORIGIN=http://localhost:3000
```

`docs/backend-foundation.md` must document local database startup, migration ownership versus runtime roles, test commands, RLS verification, API mode activation, session-cookie behavior, moderation limitations, Preview rollout, rollback to demo mode, and the deferred OAuth/media/Hermes work.

- [ ] **Step 2: Consolidate runtime configuration**

Move the `turbopack.root` setting from `next.config.ts` into `next.config.js`, remove the duplicate `next.config.ts`, and align `vercel.json` function configuration with the actual `/api/v1/community` and existing `/api/content` routes. Do not weaken existing security headers.

- [ ] **Step 3: Run targeted database and API verification**

Run:

```bash
npm run db:up
DATABASE_URL=postgres://enter_ax_owner:enter_ax_owner@localhost:54329/enter_ax_test npm run db:migrate
TEST_DATABASE_URL=postgres://enter_ax_app:enter_ax_app@localhost:54329/enter_ax_test npm test -- src/server src/app/api/v1/community src/features/community src/components/talent/CommunityBoard.test.tsx
```

Expected: all targeted tests pass with zero failures.

- [ ] **Step 4: Run the complete project verification**

Run each command separately and inspect the complete output:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Expected: every command exits `0` with zero test failures and no lint errors.

- [ ] **Step 5: Review the implementation against acceptance criteria**

Confirm with code and test evidence:

- opaque cookie session creation and revocation;
- no client-controlled author identity;
- category filtering and stable cursor pagination;
- duplicate report prevention;
- tenant membership denial across tenants;
- forced RLS and non-owner runtime operation;
- content-free audit metadata;
- API and demo UI adapters;
- documentation accurately matches implementation.

- [ ] **Step 6: Commit documentation and configuration**

```bash
git add .env.example docs/backend-foundation.md README.md vercel.json next.config.js next.config.ts
git commit -m "docs: add backend operations guide"
```

- [ ] **Step 7: Stop the local database after verification**

Run:

```bash
npm run db:down
```

Expected: the project-local PostgreSQL container stops without deleting its named development volume.
