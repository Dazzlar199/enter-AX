# Phase 2 — 기획사 계정·테넌시 배선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace anonymous demo-mode agency access with real email/password login, tenant-scoped role membership (owner/admin/member/viewer), and audit-logged authorization — so a pilot 기획사's staff can sign in as themselves instead of everyone sharing one browser's `localStorage` demo state.

**Architecture:** Mirrors the existing community-session subsystem exactly (`src/server/identity`, `src/server/http/community-handlers.ts`, `src/app/api/v1/community/session/route.ts`). A new parallel "agency identity" path reuses the same `sessions` table (generic, not community-specific), adds a `tenant_staff_profiles` table (email + password hash, one row per staff user), and reuses the already-implemented, already-tested `TenancyService.requireMembership` for role checks and 403+audit-log behavior — nothing new needed there. Frontend stays gated behind the existing `NEXT_PUBLIC_BACKEND_MODE === "api"` flag, the same flag `src/app/talent/page.tsx` already uses to swap the demo community board for the real one, so demo mode (today's sales-pitch experience) is byte-for-byte unaffected.

**Tech Stack:** Next.js 15 route handlers, `postgres` (porsager) driver, Zod validation, Node built-in `crypto.scrypt` for password hashing (no new dependency), Vitest + Testing Library, existing Postgres RLS/audit foundation from `db/migrations/001_backend_foundation.sql`.

## Global Constraints

- No new npm dependencies. Password hashing uses Node's built-in `node:crypto` (`scrypt`), matching how `src/server/identity/token.ts` already uses built-in `node:crypto` for session tokens.
- No self-service signup or email-delivered invites in this phase — accounts are created by an operator running `scripts/create-agency-account.mjs` against the database directly. (§0 decision #4 in `docs/enter-ax-upgrade-roadmap-2026-09-30.md` — which messenger/email channel delivers invites — is still unresolved; building invite delivery now would be built on an undecided requirement. Self-serve invites are explicitly deferred to a later phase.)
- Every new server-side check that denies access must go through `TenancyService.requireMembership` (already implemented, already unit-tested) so the 403 + `authorization.denied` audit event stays the single implementation, not duplicated per route.
- Follow the existing file-per-concern layout: one repository interface extension, one memory implementation, one Postgres implementation, one service, one HTTP handler module, one Next.js route module. Don't collapse layers even though the whole feature is "just login" — every other subsystem in `src/server` is already shaped this way and Phase 3 will extend the same files.
- All Korean user-facing copy matches the tone already used in `community-handlers.ts` error messages (polite, direct, ends in `.`).
- `docs/backend-foundation.md` is the living ops doc for this subsystem and must be updated as part of this plan, not left stale.

---

## ⚠️ Prerequisite finding: fix a live bug before building on top of it

While researching this plan, session-token lookup was verified against a real local PostgreSQL instance (`npm run db:up`, migrated, queried directly as the `enter_ax_app` role). **`lookup_session(token_hash)` — the function the existing, already-shipped community login depends on — returns zero rows for every caller, always, against real Postgres.** Community login has never actually worked outside of `MemoryPlatformRepository`-backed unit tests.

**Root cause:** `sessions`, `users`, and `community_profiles` all have `FORCE ROW LEVEL SECURITY` enabled. `lookup_session` is `SECURITY DEFINER`, owned by `enter_ax_owner`. `enter_ax_owner` has `rolbypassrls = false` (confirmed via `SELECT rolbypassrls FROM pg_roles`), so under `FORCE ROW LEVEL SECURITY` it is subject to policies like any other role. But every existing `SELECT` policy on these three tables is scoped `TO enter_ax_app` only (e.g. `users_self_select ... TO enter_ax_app USING (id = current_setting('app.user_id'))`). When the function runs as `enter_ax_owner`, none of those policies apply to it, there is no policy that does apply, and Postgres RLS defaults to deny — so the join returns nothing, silently (no error).

**Reproduction (already run and confirmed during planning):**
```bash
npm run db:up -- --wait
DATABASE_URL=postgres://enter_ax_owner:enter_ax_owner@localhost:54329/enter_ax_test npm run db:migrate
docker exec -e PGPASSWORD=enter_ax_app enter-ax-postgres-1 psql -U enter_ax_app -d enter_ax_test -c \
  "SELECT * FROM lookup_session('any-hash-at-all');"
# 0 rows, even for a token that was just inserted and committed.
```

This blocks Phase 2 directly: the plan below adds a second `SECURITY DEFINER` lookup function (`lookup_agency_session`) using the exact same shape. Building it without fixing the underlying gap would ship a second silently-broken login path. **Task 1 fixes this for all three existing tables before any new schema is added.**

---

## File Structure

New files:
- `db/migrations/002_fix_session_lookup_rls.sql` — owner-scoped `SELECT` policies closing the gap above.
- `db/migrations/003_agency_accounts.sql` — `tenant_staff_profiles` table, `lookup_agency_session`/`lookup_agency_credentials` functions, RLS, grants.
- `src/server/identity/password.ts` + `password.test.ts` — scrypt hash/verify.
- `src/server/http/request-context.ts` — cookie/IP/JSON helpers extracted from `community-handlers.ts` for reuse.
- `src/server/identity/agency-schema.ts` + `agency-schema.test.ts` — Zod login input schema.
- `src/server/identity/agency-account.contract.ts` — shared repository contract test (memory + Postgres).
- `src/server/http/agency-handlers.ts` + `agency-handlers.test.ts` — login/session/logout HTTP handlers.
- `scripts/create-agency-account.mjs` — operator CLI to provision a pilot tenant + first staff account.
- `src/app/api/v1/agency/session/route.ts` — Next.js route wiring.
- `src/features/agency/session-client.ts` + `session-client.test.ts` — typed fetch wrapper.
- `src/features/agency/AgencySessionProvider.tsx` — React context (mirrors `DemoProvider` shape).
- `src/components/agency/AccountBadge.tsx` + `AccountBadge.test.tsx` — signed-in user/role display + logout.
- `src/app/agency/login/page.tsx` + `page.test.tsx` — login form.

Modified files:
- `src/server/db/schema.integration.test.ts` — regression test for the RLS gap fix + new table coverage.
- `src/server/identity/model.ts` — add `AgencySession`.
- `src/server/identity/repository.ts` — extend `IdentityRepository`.
- `src/server/identity/service.ts` — add agency methods.
- `src/server/identity/service.test.ts` — agency test cases.
- `src/server/testing/memory-platform.ts` — implement new interface methods.
- `src/server/postgres/platform-repository.ts` — implement new interface methods.
- `src/server/community/memory-repository.test.ts` / `postgres-repository.integration.test.ts` — wire in the new contract.
- `src/server/http/community-handlers.ts` — use extracted helpers (no behavior change).
- `src/server/container.ts` + `container.test.ts` — wire `TenancyService` + agency handlers.
- `src/app/agency/layout.tsx` — wrap with `AgencySessionProvider`.
- `src/components/agency/console/AgencyConsoleShell.tsx` + `AgencyConsoleShell.test.tsx` — render `AccountBadge`, redirect-to-login gate, skip chrome on `/agency/login`.
- `src/app/agency/agency-console.css` — login page styles.
- `src/components/agency/TalentReview.tsx` + existing tests — disable the offer button for `viewer` role.
- `src/app/agency/talent/[id]/page.tsx` — pass `isViewOnly` down.
- `docs/backend-foundation.md` — document the agency login subsystem and the RLS gotcha.
- `docs/enter-ax-upgrade-roadmap-2026-09-30.md` — flip the Phase 2 "없는 것" bullets once shipped (final task).

---

## Task 1: Fix the session-lookup RLS gap (pre-existing bug, blocks everything below)

**Files:**
- Create: `db/migrations/002_fix_session_lookup_rls.sql`
- Modify: `src/server/db/schema.integration.test.ts`

**Interfaces:**
- Produces: no new app-level interface. Downstream tasks rely on `lookup_session` and (after Task 3) `lookup_agency_session`/`lookup_agency_credentials` actually returning rows when called by their `SECURITY DEFINER` owner.

- [ ] **Step 1: Write the failing regression test**

Add to `src/server/db/schema.integration.test.ts` (inside the existing `integrationDescribe` block, after the current two tests):

```ts
  it("lets the session-lookup function see a session it did not create the connection's context for", async () => {
    const userId = crypto.randomUUID();
    const tokenHash = crypto.randomUUID();

    await sql!.begin(async (transaction) => {
      await transaction`SELECT set_config('app.user_id', ${userId}, true)`;
      await transaction`INSERT INTO users (id) VALUES (${userId})`;
      await transaction`INSERT INTO community_profiles (user_id, nickname) VALUES (${userId}, ${`user-${userId.slice(0, 8)}`})`;
      await transaction`
        INSERT INTO sessions (user_id, token_hash, expires_at)
        VALUES (${userId}, ${tokenHash}, now() + interval '30 days')
      `;
    });

    // Fresh statement, no app.user_id set — this is what a real login-by-cookie request does:
    // it knows only the raw token, not whose session it is yet.
    const rows = await sql!<{ userId: string }[]>`
      SELECT user_id AS "userId" FROM lookup_session(${tokenHash})
    `;

    expect(rows).toEqual([{ userId }]);
  });
```

- [ ] **Step 2: Run it to confirm it fails**

```bash
npm run db:up -- --wait
DATABASE_URL=postgres://enter_ax_owner:enter_ax_owner@localhost:54329/enter_ax_test npm run db:migrate
TEST_DATABASE_URL=postgres://enter_ax_app:enter_ax_app@localhost:54329/enter_ax_test npm test -- src/server/db/schema.integration.test.ts
```
Expected: FAIL — `rows` is `[]`, not `[{ userId }]`.

- [ ] **Step 3: Write the migration**

Create `db/migrations/002_fix_session_lookup_rls.sql`:

```sql
-- lookup_session() is SECURITY DEFINER, owned by enter_ax_owner. enter_ax_owner is not
-- BYPASSRLS, and users/sessions/community_profiles all have FORCE ROW LEVEL SECURITY, so
-- the function's own reads are subject to RLS too. The existing policies on these tables
-- are all scoped `TO enter_ax_app`, so none of them apply when the function runs as
-- enter_ax_owner — the join returns zero rows for every token, always.
--
-- enter_ax_app has no direct GRANT SELECT on any of these three tables (see 001's GRANT
-- list), so these owner-scoped policies do not add any new direct read access for
-- enter_ax_app; they only unblock the SECURITY DEFINER function path.

CREATE POLICY users_owner_lookup ON users FOR SELECT TO enter_ax_owner USING (true);
CREATE POLICY sessions_owner_lookup ON sessions FOR SELECT TO enter_ax_owner USING (true);
CREATE POLICY community_profiles_owner_lookup ON community_profiles FOR SELECT TO enter_ax_owner USING (true);
```

- [ ] **Step 4: Apply the migration and re-run the test**

```bash
DATABASE_URL=postgres://enter_ax_owner:enter_ax_owner@localhost:54329/enter_ax_test npm run db:migrate
TEST_DATABASE_URL=postgres://enter_ax_app:enter_ax_app@localhost:54329/enter_ax_test npm test -- src/server/db/schema.integration.test.ts
```
Expected: PASS, all three tests in the file green.

- [ ] **Step 5: Run the full test suite to confirm no regression**

```bash
TEST_DATABASE_URL=postgres://enter_ax_app:enter_ax_app@localhost:54329/enter_ax_test npm test
```
Expected: all tests pass, including the previously-skipped-without-`TEST_DATABASE_URL` integration tests.

- [ ] **Step 6: Commit**

```bash
git add db/migrations/002_fix_session_lookup_rls.sql src/server/db/schema.integration.test.ts
git commit -m "fix: unblock session-lookup RLS for SECURITY DEFINER functions"
```

---

## Task 2: Password hashing utility

**Files:**
- Create: `src/server/identity/password.ts`
- Test: `src/server/identity/password.test.ts`

**Interfaces:**
- Produces: `hashPassword(password: string): Promise<string>`, `verifyPassword(password: string, stored: string): Promise<boolean>`.

- [ ] **Step 1: Write the failing tests**

Create `src/server/identity/password.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the correct password against its hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("correct horse battery staple", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(verifyPassword("wrong password", hash)).resolves.toBe(false);
  });

  it("salts each hash differently for the same password", async () => {
    const first = await hashPassword("same password");
    const second = await hashPassword("same password");
    expect(first).not.toBe(second);
  });

  it("rejects malformed stored hashes instead of throwing", async () => {
    await expect(verifyPassword("anything", "not-a-real-hash")).resolves.toBe(false);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- src/server/identity/password.test.ts
```
Expected: FAIL — `./password` does not exist.

- [ ] **Step 3: Implement**

Create `src/server/identity/password.ts`:

```ts
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  if (salt.length !== SALT_LENGTH || expected.length !== KEY_LENGTH) return false;
  const derivedKey = (await scrypt(password, salt, expected.length)) as Buffer;
  return timingSafeEqual(derivedKey, expected);
}
```

- [ ] **Step 4: Run to confirm pass**

```bash
npm test -- src/server/identity/password.test.ts
```
Expected: PASS, 4/4.

- [ ] **Step 5: Commit**

```bash
git add src/server/identity/password.ts src/server/identity/password.test.ts
git commit -m "feat: add scrypt password hashing for agency accounts"
```

---

## Task 3: Agency accounts database schema

**Files:**
- Create: `db/migrations/003_agency_accounts.sql`
- Modify: `src/server/db/schema.integration.test.ts`

**Interfaces:**
- Produces: table `tenant_staff_profiles(user_id, tenant_id, email, display_name, password_hash, status, created_at, updated_at)`; functions `lookup_agency_session(token_hash text)` and `lookup_agency_credentials(email text)`, both `SECURITY DEFINER` owned by `enter_ax_owner` with owner-scoped `SELECT` policies from the start (Task 1's lesson applied immediately, not retrofitted).

- [ ] **Step 1: Write the failing schema test**

Add to `src/server/db/schema.integration.test.ts`:

```ts
  it("creates the agency accounts table with forced row-level security", async () => {
    const tables = await sql!<{ tablename: string; rowsecurity: boolean; forcerowsecurity: boolean }[]>`
      SELECT c.relname AS tablename, c.relrowsecurity AS rowsecurity, c.relforcerowsecurity AS forcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname = 'tenant_staff_profiles'
    `;
    expect(tables).toEqual([{ tablename: "tenant_staff_profiles", rowsecurity: true, forcerowsecurity: true }]);
  });

  it("looks up agency credentials by email without a prior session context", async () => {
    const userId = crypto.randomUUID();
    const tenantSlug = `tenant-${userId.slice(0, 8)}`;

    await sql!.begin(async (transaction) => {
      await transaction`SELECT set_config('app.user_id', ${userId}, true)`;
      const [tenant] = await transaction`
        INSERT INTO tenants (slug, name, verification_status) VALUES (${tenantSlug}, '테스트 기획사', 'verified') RETURNING id
      `;
      await transaction`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;
      await transaction`INSERT INTO users (id) VALUES (${userId})`;
      await transaction`
        INSERT INTO tenant_staff_profiles (user_id, tenant_id, email, display_name, password_hash)
        VALUES (${userId}, ${tenant.id}, ${`${userId}@example.test`}, '테스트 담당자', 'placeholder-hash')
      `;
    });

    const rows = await sql!<{ userId: string }[]>`
      SELECT user_id AS "userId" FROM lookup_agency_credentials(${`${userId}@example.test`})
    `;
    expect(rows).toEqual([{ userId }]);
  });
```

- [ ] **Step 2: Run to confirm failure**

```bash
TEST_DATABASE_URL=postgres://enter_ax_app:enter_ax_app@localhost:54329/enter_ax_test npm test -- src/server/db/schema.integration.test.ts
```
Expected: FAIL — `tenant_staff_profiles` / `lookup_agency_credentials` do not exist.

- [ ] **Step 3: Write the migration**

Create `db/migrations/003_agency_accounts.sql`:

```sql
CREATE TABLE tenant_staff_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 60)
);

CREATE UNIQUE INDEX tenant_staff_profiles_active_email_idx
  ON tenant_staff_profiles (lower(email))
  WHERE status = 'active';

CREATE INDEX tenant_staff_profiles_tenant_id_idx ON tenant_staff_profiles (tenant_id);

ALTER TABLE tenant_staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_staff_profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_staff_profiles_self_read ON tenant_staff_profiles FOR SELECT TO enter_ax_app
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
CREATE POLICY tenant_staff_profiles_self_insert ON tenant_staff_profiles FOR INSERT TO enter_ax_app
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
CREATE POLICY tenant_staff_profiles_self_update ON tenant_staff_profiles FOR UPDATE TO enter_ax_app
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
-- Owner-scoped policy so the SECURITY DEFINER lookup functions below can actually read
-- rows (see db/migrations/002_fix_session_lookup_rls.sql for why this is required).
CREATE POLICY tenant_staff_profiles_owner_lookup ON tenant_staff_profiles FOR SELECT TO enter_ax_owner USING (true);

GRANT SELECT, INSERT, UPDATE ON tenant_staff_profiles TO enter_ax_app;

-- Account provisioning (scripts/create-agency-account.mjs) needs to create the tenant and
-- the first membership row; 001 only granted SELECT on both.
GRANT INSERT ON tenants TO enter_ax_app;
CREATE POLICY tenant_memberships_self_insert ON tenant_memberships FOR INSERT TO enter_ax_app
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
GRANT INSERT ON tenant_memberships TO enter_ax_app;

CREATE OR REPLACE FUNCTION lookup_agency_session(p_token_hash text)
RETURNS TABLE (
  session_id uuid,
  user_id uuid,
  tenant_id uuid,
  expires_at timestamptz,
  revoked_at timestamptz,
  user_status text,
  email text,
  display_name text,
  profile_status text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT s.id, s.user_id, p.tenant_id, s.expires_at, s.revoked_at, u.status, p.email, p.display_name, p.status
  FROM sessions s
  JOIN users u ON u.id = s.user_id
  JOIN tenant_staff_profiles p ON p.user_id = s.user_id
  WHERE s.token_hash = p_token_hash
  LIMIT 1
$function$;

REVOKE ALL ON FUNCTION lookup_agency_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lookup_agency_session(text) TO enter_ax_app;
ALTER FUNCTION lookup_agency_session(text) OWNER TO enter_ax_owner;

CREATE OR REPLACE FUNCTION lookup_agency_credentials(p_email text)
RETURNS TABLE (
  user_id uuid,
  tenant_id uuid,
  password_hash text,
  user_status text,
  profile_status text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT p.user_id, p.tenant_id, p.password_hash, u.status, p.status
  FROM tenant_staff_profiles p
  JOIN users u ON u.id = p.user_id
  WHERE lower(p.email) = lower(p_email) AND p.status = 'active'
  LIMIT 1
$function$;

REVOKE ALL ON FUNCTION lookup_agency_credentials(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lookup_agency_credentials(text) TO enter_ax_app;
ALTER FUNCTION lookup_agency_credentials(text) OWNER TO enter_ax_owner;
```

- [ ] **Step 4: Apply and re-run**

```bash
DATABASE_URL=postgres://enter_ax_owner:enter_ax_owner@localhost:54329/enter_ax_test npm run db:migrate
TEST_DATABASE_URL=postgres://enter_ax_app:enter_ax_app@localhost:54329/enter_ax_test npm test -- src/server/db/schema.integration.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add db/migrations/003_agency_accounts.sql src/server/db/schema.integration.test.ts
git commit -m "feat: add agency staff accounts schema with RLS"
```

---

## Task 4: Extract shared HTTP helpers (no behavior change)

**Files:**
- Create: `src/server/http/request-context.ts`
- Modify: `src/server/http/community-handlers.ts`

**Interfaces:**
- Produces: `readCookie(request, name)`, `buildSessionCookie(name, token, secure, maxAgeSeconds?)`, `clientIp(request)`, `readJson(request)`.
- Consumes (Task 9): agency handlers import the same four functions instead of redefining them.

- [ ] **Step 1: Confirm current community tests pass before touching anything**

```bash
npm test -- src/server/http/community-handlers.test.ts
```
Expected: PASS (baseline).

- [ ] **Step 2: Create the shared module**

Create `src/server/http/request-context.ts`:

```ts
import { AppError } from "@/server/shared/errors";

export function readCookie(request: Request, name: string): string | undefined {
  const raw = request.headers.get("cookie");
  if (!raw) return undefined;
  for (const part of raw.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === name) return decodeURIComponent(valueParts.join("="));
  }
  return undefined;
}

export function buildSessionCookie(
  name: string,
  token: string,
  secure: boolean,
  maxAgeSeconds = 30 * 24 * 60 * 60,
): string {
  return [
    `${name}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    secure ? "Secure" : "",
    `Max-Age=${maxAgeSeconds}`,
  ].filter(Boolean).join("; ");
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError("VALIDATION_FAILED", "JSON 요청 본문이 올바르지 않습니다.");
  }
}
```

- [ ] **Step 3: Refactor `community-handlers.ts` to use it**

In `src/server/http/community-handlers.ts`, replace the local `readCookie`, `sessionCookie`, `clientIp`, `readJson` function definitions (lines 22–53 of the current file) with an import, and update the one call site that used `sessionCookie(...)`:

```ts
import { buildSessionCookie, clientIp, readCookie, readJson } from "./request-context";
```

Replace every `sessionCookie(created.token, secureCookies)` with `buildSessionCookie(COMMUNITY_SESSION_COOKIE, created.token, secureCookies)`, and the logout call `sessionCookie("", secureCookies, 0)` with `buildSessionCookie(COMMUNITY_SESSION_COOKIE, "", secureCookies, 0)`.

- [ ] **Step 4: Re-run community tests to confirm zero behavior change**

```bash
npm test -- src/server/http/community-handlers.test.ts
```
Expected: PASS, identical to Step 1's baseline — same assertions, same cookie strings.

- [ ] **Step 5: Commit**

```bash
git add src/server/http/request-context.ts src/server/http/community-handlers.ts
git commit -m "refactor: extract shared HTTP request helpers for reuse by agency handlers"
```

---

## Task 5: Identity model and repository interface for agency accounts

**Files:**
- Modify: `src/server/identity/model.ts`
- Modify: `src/server/identity/repository.ts`

**Interfaces:**
- Produces: `AgencySession` type; `IdentityRepository` gains `createAgencyAccount`, `findAgencyCredentialsByEmail`, `createAgencySession`, `findAgencySessionByTokenHash`.
- Consumes: `TenantRole` from `@/server/tenancy/repository`.

This task has no independent test of its own — it is a pure type/interface change. It is validated by Task 6 (Memory implementation) failing to compile until the interface is satisfied, which is the intended TDD signal for an interface-first task in a strongly-typed codebase.

- [ ] **Step 1: Extend the model**

In `src/server/identity/model.ts`, add after the existing `CommunitySession` interface:

```ts
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
```

- [ ] **Step 2: Extend the repository interface**

In `src/server/identity/repository.ts`, add the import and new methods:

```ts
import type { TenantRole } from "@/server/tenancy/repository";

import type { AgencySession, CommunitySession } from "./model";

export interface IdentityRepository {
  createCommunityIdentity(input: {
    userId: string;
    nickname: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<CommunitySession>;
  findSessionByTokenHash(tokenHash: string): Promise<CommunitySession | null>;
  revokeSession(sessionId: string, userId: string): Promise<void>;

  createAgencyAccount(input: {
    userId: string;
    tenantId: string;
    email: string;
    displayName: string;
    passwordHash: string;
    role: TenantRole;
  }): Promise<{ userId: string; tenantId: string; email: string; displayName: string }>;
  findAgencyCredentialsByEmail(email: string): Promise<{
    userId: string;
    tenantId: string;
    passwordHash: string;
    userStatus: AgencySession["userStatus"];
    profileStatus: AgencySession["profileStatus"];
  } | null>;
  createAgencySession(input: { userId: string; tokenHash: string; expiresAt: string }): Promise<AgencySession>;
  findAgencySessionByTokenHash(tokenHash: string): Promise<AgencySession | null>;
}
```

- [ ] **Step 3: Confirm the expected compile failure**

```bash
npm run typecheck
```
Expected: FAIL — `MemoryPlatformRepository` and `PostgresPlatformRepository` no longer satisfy `IdentityRepository` (missing the four new methods). This is the task's test signal; Task 6 and Task 7 make it pass.

- [ ] **Step 4: Commit**

```bash
git add src/server/identity/model.ts src/server/identity/repository.ts
git commit -m "feat: define agency account identity model and repository interface"
```

---

## Task 6: In-memory repository implementation + shared contract test

**Files:**
- Modify: `src/server/testing/memory-platform.ts`
- Create: `src/server/identity/agency-account.contract.ts`
- Modify: `src/server/community/memory-repository.test.ts`

**Interfaces:**
- Consumes: `IdentityRepository` (Task 5), `TenantRole` from `@/server/tenancy/repository`.
- Produces: `MemoryPlatformRepository` fully implements `IdentityRepository`; `agencyAccountContract(name, factory)` reusable across memory and Postgres.

- [ ] **Step 1: Write the contract test (fails against both backends until Task 6+7 land)**

Create `src/server/identity/agency-account.contract.ts`:

```ts
import { expect, it } from "vitest";

import type { AuditRepository } from "@/server/audit/repository";
import type { CommunityRepository } from "@/server/community/repository";
import type { TenancyRepository } from "@/server/tenancy/repository";

import type { IdentityRepository } from "./repository";

type PlatformRepository = IdentityRepository & CommunityRepository & TenancyRepository & AuditRepository;

export function agencyAccountContract(name: string, factory: () => Promise<PlatformRepository>) {
  it(`${name}: creates an agency account, authenticates it, and scopes sessions per tenant`, async () => {
    const repository = await factory();
    const userId = crypto.randomUUID();
    const tenantId = crypto.randomUUID();
    const email = `owner-${userId.slice(0, 8)}@example.test`;

    const account = await repository.createAgencyAccount({
      userId,
      tenantId,
      email,
      displayName: "김담당",
      passwordHash: "hash-value",
      role: "owner",
    });
    expect(account).toEqual({ userId, tenantId, email, displayName: "김담당" });

    const credentials = await repository.findAgencyCredentialsByEmail(email);
    expect(credentials).toMatchObject({ userId, tenantId, passwordHash: "hash-value", userStatus: "active", profileStatus: "active" });

    expect(await repository.findAgencyCredentialsByEmail("nobody@example.test")).toBeNull();

    const session = await repository.createAgencySession({
      userId,
      tokenHash: "token-hash-value",
      expiresAt: "2026-10-30T00:00:00.000Z",
    });
    expect(session).toMatchObject({ userId, tenantId, email, displayName: "김담당", revokedAt: null });

    const found = await repository.findAgencySessionByTokenHash("token-hash-value");
    expect(found).toMatchObject({ sessionId: session.sessionId, userId, tenantId });

    await repository.revokeSession(session.sessionId, userId);
    const revoked = await repository.findAgencySessionByTokenHash("token-hash-value");
    expect(revoked?.revokedAt).not.toBeNull();
  });
}
```

Add to `src/server/community/memory-repository.test.ts`:

```ts
import { agencyAccountContract } from "@/server/identity/agency-account.contract";
// (keep the existing communityRepositoryContract import/call as-is)

agencyAccountContract("memory repository", async () => new MemoryPlatformRepository());
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- src/server/community/memory-repository.test.ts
```
Expected: FAIL — `MemoryPlatformRepository` has no `createAgencyAccount` etc.

- [ ] **Step 3: Implement in `MemoryPlatformRepository`**

In `src/server/testing/memory-platform.ts`, add imports and state, then methods.

Add to the imports:

```ts
import type { AgencySession } from "@/server/identity/model";
import type { TenantRole } from "@/server/tenancy/repository";
```

Add private fields inside the class (alongside the existing `profiles`, `sessions` maps):

```ts
  private readonly agencyProfiles = new Map<string, { tenantId: string; email: string; displayName: string; passwordHash: string; status: AgencySession["profileStatus"] }>();
  private readonly agencyEmailIndex = new Map<string, string>(); // lowercase email -> userId
  private readonly agencySessions = new Map<string, AgencySession>(); // tokenHash -> session
  private readonly agencySessionHashById = new Map<string, string>();
```

Add methods (near the existing `createCommunityIdentity`/`findSessionByTokenHash`/`revokeSession` group):

```ts
  async createAgencyAccount(input: {
    userId: string;
    tenantId: string;
    email: string;
    displayName: string;
    passwordHash: string;
    role: TenantRole;
  }): Promise<{ userId: string; tenantId: string; email: string; displayName: string }> {
    this.agencyProfiles.set(input.userId, {
      tenantId: input.tenantId,
      email: input.email,
      displayName: input.displayName,
      passwordHash: input.passwordHash,
      status: "active",
    });
    this.agencyEmailIndex.set(input.email.toLowerCase(), input.userId);
    this.memberships.push({ tenantId: input.tenantId, userId: input.userId, role: input.role, status: "active" });
    return { userId: input.userId, tenantId: input.tenantId, email: input.email, displayName: input.displayName };
  }

  async findAgencyCredentialsByEmail(email: string): Promise<{
    userId: string;
    tenantId: string;
    passwordHash: string;
    userStatus: AgencySession["userStatus"];
    profileStatus: AgencySession["profileStatus"];
  } | null> {
    const userId = this.agencyEmailIndex.get(email.toLowerCase());
    if (!userId) return null;
    const profile = this.agencyProfiles.get(userId);
    if (!profile || profile.status !== "active") return null;
    return { userId, tenantId: profile.tenantId, passwordHash: profile.passwordHash, userStatus: "active", profileStatus: profile.status };
  }

  async createAgencySession(input: { userId: string; tokenHash: string; expiresAt: string }): Promise<AgencySession> {
    const profile = this.agencyProfiles.get(input.userId);
    if (!profile) throw new AppError("NOT_FOUND", "기획사 계정을 찾을 수 없습니다.");
    const session: AgencySession = {
      sessionId: this.nextId(),
      userId: input.userId,
      tenantId: profile.tenantId,
      email: profile.email,
      displayName: profile.displayName,
      expiresAt: input.expiresAt,
      revokedAt: null,
      userStatus: "active",
      profileStatus: profile.status,
    };
    this.agencySessions.set(input.tokenHash, session);
    this.agencySessionHashById.set(session.sessionId, input.tokenHash);
    return { ...session };
  }

  async findAgencySessionByTokenHash(tokenHash: string): Promise<AgencySession | null> {
    const session = this.agencySessions.get(tokenHash);
    return session ? { ...session } : null;
  }
```

- [ ] **Step 4: Update `revokeSession` to also revoke agency sessions**

The existing `revokeSession(sessionId, userId)` method only checks the community `sessions` map. Update it to check both:

```ts
  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const tokenHash = this.sessionHashById.get(sessionId);
    const session = tokenHash ? this.sessions.get(tokenHash) : undefined;
    if (session?.userId === userId) session.revokedAt = this.now();

    const agencyTokenHash = this.agencySessionHashById.get(sessionId);
    const agencySession = agencyTokenHash ? this.agencySessions.get(agencyTokenHash) : undefined;
    if (agencySession?.userId === userId) agencySession.revokedAt = this.now();
  }
```

- [ ] **Step 5: Run to confirm pass**

```bash
npm test -- src/server/community/memory-repository.test.ts
npm run typecheck
```
Expected: PASS. `typecheck` still fails only on `PostgresPlatformRepository` (Task 7 fixes that).

- [ ] **Step 6: Commit**

```bash
git add src/server/testing/memory-platform.ts src/server/identity/agency-account.contract.ts src/server/community/memory-repository.test.ts
git commit -m "feat: implement agency accounts in the in-memory platform repository"
```

---

## Task 7: PostgreSQL repository implementation

**Files:**
- Modify: `src/server/postgres/platform-repository.ts`
- Modify: `src/server/community/postgres-repository.integration.test.ts`

**Interfaces:**
- Consumes: `IdentityRepository` (Task 5), `lookup_agency_session`/`lookup_agency_credentials` (Task 3), `agencyAccountContract` (Task 6).
- Produces: `PostgresPlatformRepository` fully implements `IdentityRepository`.

- [ ] **Step 1: Wire the contract into the integration test**

Add to `src/server/community/postgres-repository.integration.test.ts`:

```ts
import { agencyAccountContract } from "@/server/identity/agency-account.contract";
// (keep the existing communityRepositoryContract import/call as-is)

agencyAccountContract("postgres repository", async () => new PostgresPlatformRepository(sql!));
```

- [ ] **Step 2: Run to confirm failure**

```bash
TEST_DATABASE_URL=postgres://enter_ax_app:enter_ax_app@localhost:54329/enter_ax_test npm test -- src/server/community/postgres-repository.integration.test.ts
```
Expected: FAIL — `PostgresPlatformRepository` has no `createAgencyAccount` etc.

- [ ] **Step 3: Implement in `PostgresPlatformRepository`**

In `src/server/postgres/platform-repository.ts`, add the import and methods:

```ts
import type { AgencySession } from "@/server/identity/model";
import type { TenantRole } from "@/server/tenancy/repository";
```

Add methods:

```ts
  async createAgencyAccount(input: {
    userId: string;
    tenantId: string;
    email: string;
    displayName: string;
    passwordHash: string;
    role: TenantRole;
  }): Promise<{ userId: string; tenantId: string; email: string; displayName: string }> {
    try {
      return await withActorTransaction(this.sql, { userId: input.userId, tenantId: input.tenantId }, async (transaction) => {
        await transaction`INSERT INTO users (id) VALUES (${input.userId})`;
        await transaction`
          INSERT INTO tenant_staff_profiles (user_id, tenant_id, email, display_name, password_hash)
          VALUES (${input.userId}, ${input.tenantId}, ${input.email}, ${input.displayName}, ${input.passwordHash})
        `;
        await transaction`
          INSERT INTO tenant_memberships (tenant_id, user_id, role, status)
          VALUES (${input.tenantId}, ${input.userId}, ${input.role}, 'active')
        `;
        return { userId: input.userId, tenantId: input.tenantId, email: input.email, displayName: input.displayName };
      });
    } catch (error) {
      return conflict(error);
    }
  }

  async findAgencyCredentialsByEmail(email: string): Promise<{
    userId: string;
    tenantId: string;
    passwordHash: string;
    userStatus: AgencySession["userStatus"];
    profileStatus: AgencySession["profileStatus"];
  } | null> {
    const [row] = await this.sql<{
      userId: string;
      tenantId: string;
      passwordHash: string;
      userStatus: AgencySession["userStatus"];
      profileStatus: AgencySession["profileStatus"];
    }[]>`
      SELECT
        user_id AS "userId",
        tenant_id AS "tenantId",
        password_hash AS "passwordHash",
        user_status AS "userStatus",
        profile_status AS "profileStatus"
      FROM lookup_agency_credentials(${email})
    `;
    return row ?? null;
  }

  async createAgencySession(input: { userId: string; tokenHash: string; expiresAt: string }): Promise<AgencySession> {
    return withActorTransaction(this.sql, { userId: input.userId }, async (transaction) => {
      const sessionId = randomUUID();
      const [profile] = await transaction<{ tenantId: string; email: string; displayName: string }[]>`
        SELECT tenant_id AS "tenantId", email, display_name AS "displayName"
        FROM tenant_staff_profiles WHERE user_id = ${input.userId}
      `;
      if (!profile) throw new AppError("NOT_FOUND", "기획사 계정을 찾을 수 없습니다.");
      await transaction`
        INSERT INTO sessions (id, user_id, token_hash, expires_at)
        VALUES (${sessionId}, ${input.userId}, ${input.tokenHash}, ${input.expiresAt})
      `;
      return {
        sessionId,
        userId: input.userId,
        tenantId: profile.tenantId,
        email: profile.email,
        displayName: profile.displayName,
        expiresAt: input.expiresAt,
        revokedAt: null,
        userStatus: "active",
        profileStatus: "active",
      };
    });
  }

  async findAgencySessionByTokenHash(tokenHash: string): Promise<AgencySession | null> {
    const [row] = await this.sql<{
      sessionId: string;
      userId: string;
      tenantId: string;
      expiresAt: Date;
      revokedAt: Date | null;
      userStatus: AgencySession["userStatus"];
      email: string;
      displayName: string;
      profileStatus: AgencySession["profileStatus"];
    }[]>`
      SELECT
        session_id AS "sessionId",
        user_id AS "userId",
        tenant_id AS "tenantId",
        expires_at AS "expiresAt",
        revoked_at AS "revokedAt",
        user_status AS "userStatus",
        email,
        display_name AS "displayName",
        profile_status AS "profileStatus"
      FROM lookup_agency_session(${tokenHash})
    `;
    return row ? {
      ...row,
      expiresAt: row.expiresAt.toISOString(),
      revokedAt: row.revokedAt?.toISOString() ?? null,
    } : null;
  }
```

Note: `findAgencyCredentialsByEmail` reads `tenant_staff_profiles` via a `SECURITY DEFINER` function scoped correctly per Task 3, so it works without an `app.user_id` context — required, since at login time the caller doesn't know the user's id yet.

- [ ] **Step 4: Run to confirm pass**

```bash
TEST_DATABASE_URL=postgres://enter_ax_app:enter_ax_app@localhost:54329/enter_ax_test npm test -- src/server/community/postgres-repository.integration.test.ts
npm run typecheck
```
Expected: both PASS — `typecheck` is now fully clean again.

- [ ] **Step 5: Commit**

```bash
git add src/server/postgres/platform-repository.ts src/server/community/postgres-repository.integration.test.ts
git commit -m "feat: implement agency accounts in the PostgreSQL platform repository"
```

---

## Task 8: `IdentityService` agency methods

**Files:**
- Modify: `src/server/identity/service.ts`
- Modify: `src/server/identity/service.test.ts`

**Interfaces:**
- Consumes: `hashPassword`/`verifyPassword` (Task 2), `IdentityRepository` agency methods (Tasks 6/7).
- Produces: `createAgencyAccount`, `authenticateAgency`, `resolveAgencySession`, `revokeAgencySession` on `IdentityService`.

- [ ] **Step 1: Write the failing tests**

Add to `src/server/identity/service.test.ts`:

```ts
import { hashPassword } from "./password";

describe("IdentityService — agency accounts", () => {
  it("creates an agency account and authenticates it with the right password", async () => {
    const repository = new MemoryPlatformRepository(() => "2026-09-30T00:00:00.000Z");
    const service = new IdentityService({
      identity: repository,
      audit: repository,
      now: () => new Date("2026-09-30T00:00:00.000Z"),
      createToken: () => "agency-raw-token",
      createId: () => "00000000-0000-4000-8000-000000000201",
    });

    const account = await service.createAgencyAccount({
      tenantId: "00000000-0000-4000-8000-000000000010",
      email: "owner@example.test",
      displayName: "김담당",
      password: "correct horse battery staple",
      role: "owner",
      requestId: "req-create",
    });
    expect(account.email).toBe("owner@example.test");
    expect(repository.auditEvents.at(-1)).toMatchObject({ action: "agency.account.created" });

    const authenticated = await service.authenticateAgency({
      email: "owner@example.test",
      password: "correct horse battery staple",
      requestId: "req-login",
    });
    expect(authenticated?.token).toBe("agency-raw-token");
    expect(authenticated?.session).toMatchObject({ email: "owner@example.test", tenantId: "00000000-0000-4000-8000-000000000010" });
    expect(repository.auditEvents.at(-1)).toMatchObject({ action: "agency.session.created" });
  });

  it("rejects the wrong password and audits the failure without leaking it", async () => {
    const repository = new MemoryPlatformRepository(() => "2026-09-30T00:00:00.000Z");
    const service = new IdentityService({
      identity: repository,
      audit: repository,
      now: () => new Date("2026-09-30T00:00:00.000Z"),
      createId: () => "00000000-0000-4000-8000-000000000202",
    });
    await service.createAgencyAccount({
      tenantId: "00000000-0000-4000-8000-000000000010",
      email: "owner2@example.test",
      displayName: "박담당",
      password: "correct horse battery staple",
      role: "owner",
      requestId: "req-create-2",
    });

    const result = await service.authenticateAgency({
      email: "owner2@example.test",
      password: "wrong password",
      requestId: "req-login-fail",
    });

    expect(result).toBeNull();
    expect(repository.auditEvents.at(-1)).toMatchObject({ action: "agency.session.login_failed" });
    expect(JSON.stringify(repository.auditEvents)).not.toContain("wrong password");
  });

  it("resolves and revokes an agency session", async () => {
    const repository = new MemoryPlatformRepository(() => "2026-09-30T00:00:00.000Z");
    const service = new IdentityService({
      identity: repository,
      audit: repository,
      now: () => new Date("2026-09-30T00:00:00.000Z"),
      createToken: () => "agency-session-token",
      createId: () => "00000000-0000-4000-8000-000000000203",
    });
    await service.createAgencyAccount({
      tenantId: "00000000-0000-4000-8000-000000000010",
      email: "owner3@example.test",
      displayName: "이담당",
      password: "correct horse battery staple",
      role: "owner",
      requestId: "req-create-3",
    });
    const authenticated = await service.authenticateAgency({
      email: "owner3@example.test",
      password: "correct horse battery staple",
      requestId: "req-login-3",
    });

    expect(await service.resolveAgencySession("agency-session-token")).toMatchObject({ email: "owner3@example.test" });

    await service.revokeAgencySession(authenticated!.session, "req-revoke-3");

    expect(await service.resolveAgencySession("agency-session-token")).toBeNull();
    expect(repository.auditEvents.at(-1)).toMatchObject({ action: "agency.session.revoked" });
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- src/server/identity/service.test.ts
```
Expected: FAIL — `IdentityService` has no `createAgencyAccount`/`authenticateAgency`/etc.

- [ ] **Step 3: Implement**

In `src/server/identity/service.ts`, add the import and methods (inside the existing `IdentityService` class, after `revokeCommunitySession`):

```ts
import { hashPassword, verifyPassword } from "./password";
import type { TenantRole } from "@/server/tenancy/repository";
import type { AgencySession } from "./model";
```

```ts
  async createAgencyAccount(input: {
    tenantId: string;
    email: string;
    displayName: string;
    password: string;
    role: TenantRole;
    requestId: string;
  }): Promise<{ userId: string; tenantId: string; email: string; displayName: string }> {
    const userId = this.createId();
    const passwordHash = await hashPassword(input.password);
    const account = await this.identity.createAgencyAccount({
      userId,
      tenantId: input.tenantId,
      email: input.email,
      displayName: input.displayName,
      passwordHash,
      role: input.role,
    });
    await this.audit.append({
      actorUserId: null,
      tenantId: input.tenantId,
      action: "agency.account.created",
      subjectType: "user",
      subjectId: userId,
      requestId: input.requestId,
      metadata: { role: input.role },
    });
    return account;
  }

  async authenticateAgency(input: {
    email: string;
    password: string;
    requestId: string;
  }): Promise<{ token: string; session: AgencySession } | null> {
    const credentials = await this.identity.findAgencyCredentialsByEmail(input.email);
    if (!credentials || credentials.userStatus !== "active" || credentials.profileStatus !== "active") {
      await this.audit.append({
        actorUserId: null,
        tenantId: null,
        action: "agency.session.login_failed",
        subjectType: "session",
        subjectId: null,
        requestId: input.requestId,
        metadata: { reason: "not_found" },
      });
      return null;
    }
    const validPassword = await verifyPassword(input.password, credentials.passwordHash);
    if (!validPassword) {
      await this.audit.append({
        actorUserId: credentials.userId,
        tenantId: credentials.tenantId,
        action: "agency.session.login_failed",
        subjectType: "session",
        subjectId: null,
        requestId: input.requestId,
        metadata: { reason: "bad_password" },
      });
      return null;
    }
    const token = this.createToken();
    const now = this.now();
    const session = await this.identity.createAgencySession({
      userId: credentials.userId,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
    });
    await this.audit.append({
      actorUserId: session.userId,
      tenantId: session.tenantId,
      action: "agency.session.created",
      subjectType: "session",
      subjectId: session.sessionId,
      requestId: input.requestId,
      metadata: {},
    });
    return { token, session };
  }

  async resolveAgencySession(rawToken: string | undefined): Promise<AgencySession | null> {
    if (!rawToken) return null;
    const session = await this.identity.findAgencySessionByTokenHash(hashSessionToken(rawToken));
    if (!session) return null;
    if (session.revokedAt || Date.parse(session.expiresAt) <= this.now().getTime()) return null;
    if (session.userStatus !== "active" || session.profileStatus !== "active") return null;
    return session;
  }

  async revokeAgencySession(session: AgencySession, requestId: string): Promise<void> {
    await this.identity.revokeSession(session.sessionId, session.userId);
    await this.audit.append({
      actorUserId: session.userId,
      tenantId: session.tenantId,
      action: "agency.session.revoked",
      subjectType: "session",
      subjectId: session.sessionId,
      requestId,
      metadata: {},
    });
  }
```

- [ ] **Step 4: Run to confirm pass**

```bash
npm test -- src/server/identity/service.test.ts
```
Expected: PASS, all cases including the pre-existing community ones.

- [ ] **Step 5: Commit**

```bash
git add src/server/identity/service.ts src/server/identity/service.test.ts
git commit -m "feat: add agency account creation, login, and session lifecycle to IdentityService"
```

---

## Task 9: Agency login schema and HTTP handlers

**Files:**
- Create: `src/server/identity/agency-schema.ts`
- Create: `src/server/identity/agency-schema.test.ts`
- Create: `src/server/http/agency-handlers.ts`
- Create: `src/server/http/agency-handlers.test.ts`

**Interfaces:**
- Consumes: `IdentityService` (Task 8), `TenancyService.requireMembership` (already implemented, unchanged), `request-context.ts` helpers (Task 4).
- Produces: `createAgencyHandlers({ identity, tenancy, limiter, appOrigin, secureCookies })` returning `{ postAgencySession, getAgencySession, deleteAgencySession }`; cookie name `AGENCY_SESSION_COOKIE`.

- [ ] **Step 1: Write the schema test**

Create `src/server/identity/agency-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { agencyLoginSchema } from "./agency-schema";

describe("agency login schema", () => {
  it("lowercases and trims the email", () => {
    expect(agencyLoginSchema.parse({ email: "  Owner@Example.TEST ", password: "12345678" }).email).toBe("owner@example.test");
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(agencyLoginSchema.safeParse({ email: "a@b.test", password: "1234567" }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(agencyLoginSchema.safeParse({ email: "not-an-email", password: "12345678" }).success).toBe(false);
  });

  it("rejects unknown fields", () => {
    expect(agencyLoginSchema.safeParse({ email: "a@b.test", password: "12345678", role: "owner" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to confirm failure, then implement**

```bash
npm test -- src/server/identity/agency-schema.test.ts
```
Expected: FAIL.

Create `src/server/identity/agency-schema.ts`:

```ts
import { z } from "zod";

export const agencyLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
}).strict();

export type AgencyLoginInput = z.infer<typeof agencyLoginSchema>;
```

Run again — expected PASS.

- [ ] **Step 3: Write the handler tests**

Create `src/server/http/agency-handlers.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";

import { IdentityService } from "@/server/identity/service";
import { MemoryRateLimiter } from "@/server/shared/rate-limit";
import { TenancyService } from "@/server/tenancy/service";
import { MemoryPlatformRepository } from "@/server/testing/memory-platform";

import { createAgencyHandlers } from "./agency-handlers";

const origin = "https://enter-ax.test";
const tenantId = "00000000-0000-4000-8000-000000000010";

function request(path: string, init?: RequestInit) {
  return new Request(`${origin}${path}`, init);
}

describe("agency HTTP handlers", () => {
  let repository: MemoryPlatformRepository;
  let handlers: ReturnType<typeof createAgencyHandlers>;

  beforeEach(async () => {
    repository = new MemoryPlatformRepository(() => "2026-09-30T00:00:00.000Z");
    const identity = new IdentityService({
      identity: repository,
      audit: repository,
      now: () => new Date("2026-09-30T00:00:00.000Z"),
      createToken: () => "agency-cookie-token",
      createId: () => "00000000-0000-4000-8000-000000000301",
    });
    handlers = createAgencyHandlers({
      identity,
      tenancy: new TenancyService(repository, repository),
      limiter: new MemoryRateLimiter(() => 1_000),
      appOrigin: origin,
      secureCookies: true,
    });
    await identity.createAgencyAccount({
      tenantId,
      email: "owner@example.test",
      displayName: "김담당",
      password: "correct horse battery staple",
      role: "owner",
      requestId: "req-seed",
    });
  });

  it("logs in with a secure cookie and returns the role", async () => {
    const response = await handlers.postAgencySession(request("/api/v1/agency/session", {
      method: "POST",
      headers: { "content-type": "application/json", origin, "x-forwarded-for": "203.0.113.1" },
      body: JSON.stringify({ email: "owner@example.test", password: "correct horse battery staple" }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ profile: { email: "owner@example.test", displayName: "김담당", role: "owner", tenantId } });
    expect(response.headers.get("set-cookie")).toContain("enter_ax_agency_session=agency-cookie-token");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("rejects the wrong password without leaking whether the email exists", async () => {
    const response = await handlers.postAgencySession(request("/api/v1/agency/session", {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ email: "owner@example.test", password: "totally wrong password" }),
    }));
    expect(response.status).toBe(401);
  });

  it("returns 401 for getSession without a cookie", async () => {
    const response = await handlers.getAgencySession(request("/api/v1/agency/session", { headers: { "x-request-id": "req-x" } }));
    expect(response.status).toBe(401);
  });

  it("returns 403 and audits when the membership has been revoked", async () => {
    const login = await handlers.postAgencySession(request("/api/v1/agency/session", {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ email: "owner@example.test", password: "correct horse battery staple" }),
    }));
    const cookie = login.headers.get("set-cookie")!.split(";")[0];
    repository.seedMembership({ tenantId, userId: "00000000-0000-4000-8000-000000000301", role: "owner", status: "suspended" });

    const response = await handlers.getAgencySession(request("/api/v1/agency/session", {
      headers: { cookie, "x-request-id": "req-forbidden" },
    }));

    expect(response.status).toBe(403);
    expect(repository.auditEvents.at(-1)).toMatchObject({ action: "authorization.denied" });
  });

  it("logs out and clears the cookie", async () => {
    const login = await handlers.postAgencySession(request("/api/v1/agency/session", {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ email: "owner@example.test", password: "correct horse battery staple" }),
    }));
    const cookie = login.headers.get("set-cookie")!.split(";")[0];

    const response = await handlers.deleteAgencySession(request("/api/v1/agency/session", {
      method: "DELETE",
      headers: { origin, cookie },
    }));

    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
```

Note on the "revoked membership" test: `MemoryPlatformRepository.seedMembership` pushes a new membership row rather than replacing; since `findActiveMembership` filters `status === 'active'` and the freshly-seeded one is `'suspended'`, and the original `'active'` one from account creation is still in the array too — replace the array lookup semantics by asserting on the FIRST match only if `TenancyService`/`findActiveMembership` returns the first active match. To keep the test unambiguous, seed a *different* userId's revoked state instead: this plan's Step 3 test seeds a **second, conflicting** row for the same (`tenantId`, `userId`) pair, which `Array.prototype.find` will still resolve to the original active one first. **Fix before implementing**: call a new `MemoryPlatformRepository` test helper instead — revoke the original by status update. Use this corrected assertion block in place of the one above:

```ts
  it("returns 403 and audits when the membership has been revoked", async () => {
    const login = await handlers.postAgencySession(request("/api/v1/agency/session", {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify({ email: "owner@example.test", password: "correct horse battery staple" }),
    }));
    const cookie = login.headers.get("set-cookie")!.split(";")[0];
    repository.setMembershipStatus(tenantId, "00000000-0000-4000-8000-000000000301", "suspended");

    const response = await handlers.getAgencySession(request("/api/v1/agency/session", {
      headers: { cookie, "x-request-id": "req-forbidden" },
    }));

    expect(response.status).toBe(403);
    expect(repository.auditEvents.at(-1)).toMatchObject({ action: "authorization.denied" });
  });
```

This requires one small addition to `MemoryPlatformRepository` (`src/server/testing/memory-platform.ts`), alongside the existing `seedMembership`:

```ts
  setMembershipStatus(tenantId: string, userId: string, status: TenantMembership["status"]): void {
    const membership = this.memberships.find((item) => item.tenantId === tenantId && item.userId === userId);
    if (membership) membership.status = status;
  }
```

- [ ] **Step 4: Run to confirm failure**

```bash
npm test -- src/server/http/agency-handlers.test.ts
```
Expected: FAIL — `./agency-handlers` does not exist; `setMembershipStatus` does not exist.

- [ ] **Step 5: Add `setMembershipStatus` to `MemoryPlatformRepository`, then implement the handlers**

Add the method from Step 3 to `src/server/testing/memory-platform.ts`.

Create `src/server/http/agency-handlers.ts`:

```ts
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
```

- [ ] **Step 6: Run to confirm pass**

```bash
npm test -- src/server/http/agency-handlers.test.ts src/server/identity/agency-schema.test.ts
```
Expected: PASS, all cases.

- [ ] **Step 7: Commit**

```bash
git add src/server/identity/agency-schema.ts src/server/identity/agency-schema.test.ts src/server/http/agency-handlers.ts src/server/http/agency-handlers.test.ts src/server/testing/memory-platform.ts
git commit -m "feat: add agency login/session/logout HTTP handlers"
```

---

## Task 10: Wire into the server container and Next.js route

**Files:**
- Modify: `src/server/container.ts`
- Modify: `src/server/container.test.ts`
- Create: `src/app/api/v1/agency/session/route.ts`

**Interfaces:**
- Consumes: `createAgencyHandlers` (Task 9), `TenancyService` (existing, currently unused by the container).
- Produces: `getServerContainer().handlers.postAgencySession/getAgencySession/deleteAgencySession`.

- [ ] **Step 1: Write the failing container test**

Add to `src/server/container.test.ts`:

```ts
  it("wires agency session handlers in both modes", () => {
    const demoContainer = createServerContainer({
      config: { mode: "demo", nodeEnv: "development", appOrigin: "http://localhost:3000", secureCookies: false },
      sqlFactory: vi.fn(),
    });
    expect(demoContainer.handlers.postAgencySession).toBeInstanceOf(Function);
    expect(demoContainer.handlers.getAgencySession).toBeInstanceOf(Function);
    expect(demoContainer.handlers.deleteAgencySession).toBeInstanceOf(Function);
  });
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- src/server/container.test.ts
```
Expected: FAIL — those handler keys are `undefined`.

- [ ] **Step 3: Update the container**

In `src/server/container.ts`, add the import and wire `TenancyService` + `createAgencyHandlers` into both branches:

```ts
import { TenancyService } from "@/server/tenancy/service";

import { createAgencyHandlers } from "./http/agency-handlers";
```

```ts
export function createServerContainer(input: {
  config: ServerConfig;
  sqlFactory?: (databaseUrl: string) => Sql;
}) {
  const { config } = input;
  const sqlFactory = input.sqlFactory ?? createRuntimeSql;
  if (config.mode === "api") {
    const sql = sqlFactory(config.databaseUrl!);
    const repository = new PostgresPlatformRepository(sql);
    const identity = new IdentityService({ identity: repository, audit: repository });
    const tenancy = new TenancyService(repository, repository);
    const limiter = new PostgresRateLimiter(sql);
    return {
      handlers: {
        ...createCommunityHandlers({
          identity,
          community: new CommunityService(repository, repository),
          limiter,
          appOrigin: config.appOrigin,
          secureCookies: config.secureCookies,
        }),
        ...createAgencyHandlers({ identity, tenancy, limiter, appOrigin: config.appOrigin, secureCookies: config.secureCookies }),
      },
      close: () => sql.end(),
    };
  }

  const repository = new MemoryPlatformRepository();
  const identity = new IdentityService({ identity: repository, audit: repository });
  const tenancy = new TenancyService(repository, repository);
  const limiter = new MemoryRateLimiter();
  return {
    handlers: {
      ...createCommunityHandlers({
        identity,
        community: new CommunityService(repository, repository),
        limiter,
        appOrigin: config.appOrigin,
        secureCookies: config.secureCookies,
      }),
      ...createAgencyHandlers({ identity, tenancy, limiter, appOrigin: config.appOrigin, secureCookies: config.secureCookies }),
    },
    close: async () => undefined,
  };
}
```

(Both branches now build one shared `identity`/`limiter` instance and pass it to both handler factories, instead of constructing `IdentityService` twice — this also means one rate limiter budget is shared across community and agency session endpoints, which is fine since their cache keys are already prefixed differently: `session:` vs `agency-session:`.)

- [ ] **Step 4: Run to confirm pass**

```bash
npm test -- src/server/container.test.ts
npm run typecheck
```
Expected: PASS.

- [ ] **Step 5: Add the Next.js route**

Create `src/app/api/v1/agency/session/route.ts`:

```ts
import { getServerContainer } from "@/server/container";

export const runtime = "nodejs";

export function GET(request: Request) {
  return getServerContainer().handlers.getAgencySession(request);
}

export function POST(request: Request) {
  return getServerContainer().handlers.postAgencySession(request);
}

export function DELETE(request: Request) {
  return getServerContainer().handlers.deleteAgencySession(request);
}
```

- [ ] **Step 6: Commit**

```bash
git add src/server/container.ts src/server/container.test.ts src/app/api/v1/agency/session/route.ts
git commit -m "feat: wire agency session handlers into the server container and route"
```

---

## Task 11: Operator CLI to provision a pilot agency account

**Files:**
- Create: `scripts/create-agency-account.mjs`

**Interfaces:**
- Consumes: nothing from `src/` (deliberately dependency-free, mirrors `scripts/db-migrate.mjs`'s standalone style — Node cannot import `.ts` files without a loader this project doesn't have).

This task's "test" is a manual end-to-end run against the local database, matching how `db-migrate.mjs` itself has no automated test in this codebase.

- [ ] **Step 1: Implement**

Create `scripts/create-agency-account.mjs`:

```js
import { randomBytes, randomUUID, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

import postgres from "postgres";

// Mirrors src/server/identity/password.ts hashPassword() exactly (salt:hash hex format,
// 64-byte scrypt key) so the app can verify passwords this script creates. Duplicated
// here, not imported, because this script runs as plain Node ESM without a TypeScript
// loader — keep the two in sync if either changes.
const scrypt = promisify(scryptCallback);

async function hashPassword(password) {
  const salt = randomBytes(16);
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

function generateTemporaryPassword() {
  return randomBytes(12).toString("base64url");
}

const [, , tenantSlug, tenantName, email, displayName, role = "owner"] = process.argv;
if (!tenantSlug || !tenantName || !email || !displayName) {
  console.error(
    "Usage: node scripts/create-agency-account.mjs <tenant-slug> <tenant-name> <email> <display-name> [role=owner]",
  );
  process.exit(1);
}
const allowedRoles = ["owner", "admin", "member", "viewer"];
if (!allowedRoles.includes(role)) {
  console.error(`role must be one of: ${allowedRoles.join(", ")}`);
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const sql = postgres(databaseUrl, { max: 1 });
const userId = randomUUID();
const password = generateTemporaryPassword();
const passwordHash = await hashPassword(password);

try {
  await sql.begin(async (transaction) => {
    await transaction`SELECT set_config('app.user_id', ${userId}, true)`;

    const [tenant] = await transaction`
      INSERT INTO tenants (slug, name, verification_status)
      VALUES (${tenantSlug}, ${tenantName}, 'verified')
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `;
    await transaction`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;
    await transaction`INSERT INTO users (id) VALUES (${userId})`;
    await transaction`
      INSERT INTO tenant_staff_profiles (user_id, tenant_id, email, display_name, password_hash)
      VALUES (${userId}, ${tenant.id}, ${email}, ${displayName}, ${passwordHash})
    `;
    await transaction`
      INSERT INTO tenant_memberships (tenant_id, user_id, role, status)
      VALUES (${tenant.id}, ${userId}, ${role}, 'active')
    `;
  });
  process.stdout.write(
    `Created agency account.\n  tenant: ${tenantSlug} (${tenantName})\n  email: ${email}\n  role: ${role}\n  temporary password: ${password}\n\nShare the password with the pilot agency over a secure channel.\n`,
  );
} finally {
  await sql.end();
}
```

- [ ] **Step 2: Manual verification against the local database**

```bash
npm run db:up -- --wait
DATABASE_URL=postgres://enter_ax_owner:enter_ax_owner@localhost:54329/enter_ax_test npm run db:migrate
DATABASE_URL=postgres://enter_ax_app:enter_ax_app@localhost:54329/enter_ax_test \
  node scripts/create-agency-account.mjs pilot-agency "파일럿 기획사" owner@pilot-agency.test "김담당"
```
Expected: prints a temporary password. Then, with a running dev server (`NEXT_PUBLIC_BACKEND_MODE=api npm run dev`), confirm login works:

```bash
curl -i -X POST http://localhost:3000/api/v1/agency/session \
  -H 'content-type: application/json' -H 'origin: http://localhost:3000' \
  -d '{"email":"owner@pilot-agency.test","password":"<printed password>"}'
```
Expected: `200`, a `set-cookie: enter_ax_agency_session=...` header, and a JSON body with `role: "owner"`.

- [ ] **Step 3: Commit**

```bash
git add scripts/create-agency-account.mjs
git commit -m "feat: add operator CLI to provision pilot agency accounts"
```

---

## Task 12: Client-side session module and React context

**Files:**
- Create: `src/features/agency/session-client.ts`
- Create: `src/features/agency/session-client.test.ts`
- Create: `src/features/agency/AgencySessionProvider.tsx`

**Interfaces:**
- Produces: `fetchAgencySession`, `loginAgency`, `logoutAgency`, `AgencyProfile`, `AgencySessionError`; `AgencySessionProvider`, `useAgencySession()` returning `{ profile, status, login, logout }`.

- [ ] **Step 1: Write the failing client tests**

Create `src/features/agency/session-client.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";

import { AgencySessionError, fetchAgencySession, loginAgency, logoutAgency } from "./session-client";

describe("agency session client", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));

  it("returns null when unauthenticated instead of throwing", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json(
      { error: { code: "UNAUTHENTICATED", message: "기획사 로그인이 필요합니다.", requestId: "req-1" } },
      { status: 401 },
    ));
    await expect(fetchAgencySession()).resolves.toBeNull();
  });

  it("logs in and returns the profile", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json(
      { profile: { email: "owner@example.test", displayName: "김담당", tenantId: "t-1", role: "owner" } },
      { status: 200 },
    ));
    const profile = await loginAgency("owner@example.test", "correct horse battery staple");
    expect(profile).toEqual({ email: "owner@example.test", displayName: "김담당", tenantId: "t-1", role: "owner" });
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.credentials).toBe("include");
  });

  it("surfaces structured errors other than UNAUTHENTICATED", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json(
      { error: { code: "RATE_LIMITED", message: "요청이 너무 많습니다.", requestId: "req-2" } },
      { status: 429 },
    ));
    await expect(loginAgency("a@b.test", "password123")).rejects.toEqual(
      expect.objectContaining<Partial<AgencySessionError>>({ code: "RATE_LIMITED" }),
    );
  });

  it("logs out with no body expected on 204", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));
    await expect(logoutAgency()).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run to confirm failure, then implement**

```bash
npm test -- src/features/agency/session-client.test.ts
```
Expected: FAIL.

Create `src/features/agency/session-client.ts`:

```ts
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
```

- [ ] **Step 3: Run to confirm pass**

```bash
npm test -- src/features/agency/session-client.test.ts
```
Expected: PASS.

- [ ] **Step 4: Implement the React context**

Create `src/features/agency/AgencySessionProvider.tsx`:

```tsx
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
```

This has no dedicated unit test — it is exercised end-to-end by Task 13's `AccountBadge.test.tsx` and login page test, which render it through the real provider (consistent with how `DemoProvider` itself has no standalone test file and is instead exercised through the components that use it).

- [ ] **Step 5: Commit**

```bash
git add src/features/agency/session-client.ts src/features/agency/session-client.test.ts src/features/agency/AgencySessionProvider.tsx
git commit -m "feat: add agency session client and React context"
```

---

## Task 13: Login page, account badge, and console shell wiring

**Files:**
- Create: `src/app/agency/login/page.tsx`
- Create: `src/app/agency/login/page.test.tsx`
- Create: `src/components/agency/AccountBadge.tsx`
- Create: `src/components/agency/AccountBadge.test.tsx`
- Modify: `src/app/agency/layout.tsx`
- Modify: `src/components/agency/console/AgencyConsoleShell.tsx`
- Modify: `src/components/agency/console/AgencyConsoleShell.test.tsx`
- Modify: `src/app/agency/agency-console.css`

**Interfaces:**
- Consumes: `useAgencySession` (Task 12).

- [ ] **Step 1: Write the failing `AccountBadge` test**

Create `src/components/agency/AccountBadge.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AccountBadge } from "./AccountBadge";
import { AgencySessionProvider } from "@/features/agency/AgencySessionProvider";

describe("AccountBadge", () => {
  it("renders nothing while there is no signed-in profile", () => {
    render(
      <AgencySessionProvider>
        <AccountBadge />
      </AgencySessionProvider>,
    );
    expect(screen.queryByLabelText("로그인 계정")).not.toBeInTheDocument();
  });
});
```

(`NEXT_PUBLIC_BACKEND_MODE` is `undefined` in the test environment, i.e. demo mode, so `AgencySessionProvider` never fetches and `profile` stays `null` — this test proves the badge stays invisible in demo mode, matching `DemoBadge`'s inverse behavior.)

- [ ] **Step 2: Run to confirm failure, then implement**

```bash
npm test -- src/components/agency/AccountBadge.test.tsx
```
Expected: FAIL — module does not exist.

Create `src/components/agency/AccountBadge.tsx`:

```tsx
"use client";

import { useAgencySession } from "@/features/agency/AgencySessionProvider";

const roleLabel: Record<string, string> = {
  owner: "관리자",
  admin: "관리자",
  member: "캐스팅 담당",
  viewer: "열람 전용",
};

export function AccountBadge() {
  const { profile, logout } = useAgencySession();
  if (!profile) return null;

  return (
    <div aria-label="로그인 계정" className="account-badge">
      <span className="account-badge__name">{profile.displayName}</span>
      <span className="account-badge__role">{roleLabel[profile.role] ?? profile.role}</span>
      <button className="account-badge__logout" type="button" onClick={() => logout()}>로그아웃</button>
    </div>
  );
}
```

- [ ] **Step 3: Run to confirm pass**

```bash
npm test -- src/components/agency/AccountBadge.test.tsx
```
Expected: PASS.

- [ ] **Step 4: Write the failing login page test**

Create `src/app/agency/login/page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AgencySessionProvider } from "@/features/agency/AgencySessionProvider";

import AgencyLoginPage from "./page";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

describe("AgencyLoginPage", () => {
  beforeEach(() => {
    replace.mockClear();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows an error message when login fails", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json(
      { error: { code: "UNAUTHENTICATED", message: "이메일 또는 비밀번호가 올바르지 않습니다.", requestId: "req-1" } },
      { status: 401 },
    ));
    const user = userEvent.setup();
    render(<AgencySessionProvider><AgencyLoginPage /></AgencySessionProvider>);

    await user.type(screen.getByLabelText("이메일"), "owner@example.test");
    await user.type(screen.getByLabelText("비밀번호"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("이메일 또는 비밀번호가 올바르지 않습니다.");
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects to the console on success", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json(
      { profile: { email: "owner@example.test", displayName: "김담당", tenantId: "t-1", role: "owner" } },
      { status: 200 },
    ));
    const user = userEvent.setup();
    render(<AgencySessionProvider><AgencyLoginPage /></AgencySessionProvider>);

    await user.type(screen.getByLabelText("이메일"), "owner@example.test");
    await user.type(screen.getByLabelText("비밀번호"), "correct horse battery staple");
    await user.click(screen.getByRole("button", { name: "로그인" }));

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith("/agency"));
  });
});
```

- [ ] **Step 5: Run to confirm failure, then implement**

```bash
npm test -- src/app/agency/login/page.test.tsx
```
Expected: FAIL — page does not exist.

Create `src/app/agency/login/page.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { useAgencySession } from "@/features/agency/AgencySessionProvider";

export default function AgencyLoginPage() {
  const router = useRouter();
  const { login } = useAgencySession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      router.replace("/agency");
    } catch {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="agency-login">
      <form className="agency-login__form" onSubmit={submit}>
        <h1>기획사 로그인</h1>
        <label>
          <span>이메일</span>
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          <span>비밀번호</span>
          <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <button disabled={submitting} type="submit">{submitting ? "로그인 중..." : "로그인"}</button>
      </form>
    </main>
  );
}
```

- [ ] **Step 6: Run to confirm pass**

```bash
npm test -- src/app/agency/login/page.test.tsx
```
Expected: PASS.

- [ ] **Step 7: Append login page styles**

Append to `src/app/agency/agency-console.css`:

```css
.agency-login {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: var(--space-6, 24px);
}

.agency-login__form {
  width: 100%;
  max-width: 360px;
  display: grid;
  gap: var(--space-4, 16px);
}

.agency-login__form label {
  display: grid;
  gap: var(--space-2, 8px);
}

.agency-login__form input {
  padding: var(--space-3, 12px);
  border: 1px solid var(--border-default, #d8dbe0);
  border-radius: 8px;
}

.agency-login__form [role="alert"] {
  color: var(--text-danger, #c4392c);
}
```

(Variable names follow the existing `--space-*`/`--border-*`/`--text-*` token convention already defined in `src/app/globals.css`; fall back values are provided in case a token name doesn't match exactly — confirm against `globals.css` during implementation and adjust to the nearest existing token rather than introducing new ones.)

- [ ] **Step 8: Wrap the agency layout with the provider**

Modify `src/app/agency/layout.tsx`:

```tsx
import type { ReactNode } from "react";

import { AgencyConsoleShell } from "@/components/agency/console/AgencyConsoleShell";
import { AgencySessionProvider } from "@/features/agency/AgencySessionProvider";

import "./agency-console.css";

export default function AgencyLayout({ children }: { children: ReactNode }) {
  return (
    <AgencySessionProvider>
      <AgencyConsoleShell>{children}</AgencyConsoleShell>
    </AgencySessionProvider>
  );
}
```

- [ ] **Step 9: Write the failing shell-gating test**

Add to `src/components/agency/console/AgencyConsoleShell.test.tsx` (check the existing file first for its exact render-wrapper helper and mirror it — it almost certainly already wraps with `DemoProvider`; wrap with `AgencySessionProvider` too):

```tsx
  it("renders login page children without the sidebar chrome", () => {
    vi.mocked(usePathname).mockReturnValue("/agency/login");
    render(
      <AgencySessionProvider>
        <DemoProvider>
          <AgencyConsoleShell><p>login form</p></AgencyConsoleShell>
        </DemoProvider>
      </AgencySessionProvider>,
    );
    expect(screen.getByText("login form")).toBeInTheDocument();
    expect(screen.queryByLabelText("기획사 메뉴")).not.toBeInTheDocument();
  });
```

Adjust the mock import at the top of the file if `usePathname` isn't already mocked there (check first — `AgencyConsoleShell` already calls `usePathname()` today, so the existing test file almost certainly already has a `vi.mock("next/navigation", ...)` block; extend that mock's return value per-test rather than adding a second mock).

- [ ] **Step 10: Run to confirm failure**

```bash
npm test -- src/components/agency/console/AgencyConsoleShell.test.tsx
```
Expected: FAIL — sidebar still renders on `/agency/login`.

- [ ] **Step 11: Implement the shell changes**

Modify `src/components/agency/console/AgencyConsoleShell.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { AccountBadge } from "@/components/agency/AccountBadge";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { RoleSwitcher } from "@/components/shared/RoleSwitcher";
import { useDemo } from "@/features/demo/DemoProvider";
import { useAgencySession } from "@/features/agency/AgencySessionProvider";

// ...(icons, navigationGroups, NavIcon unchanged)...

const isApiMode = process.env.NEXT_PUBLIC_BACKEND_MODE === "api";

export function AgencyConsoleShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useDemo();
  const { profile, status } = useAgencySession();
  const agency = state.agencies.find((item) => item.id === state.activeAgencyId);
  const isLoginRoute = pathname === "/agency/login";

  useEffect(() => {
    if (isApiMode && !isLoginRoute && status === "ready" && !profile) {
      router.replace("/agency/login");
    }
  }, [isApiMode, isLoginRoute, status, profile, router]);

  if (isLoginRoute) return <>{children}</>;

  return (
    <div className="agency-console-shell">
      {/* ...unchanged sidebar/nav markup... */}
      <div className="agency-console-frame">
        <header className="agency-console-topbar">
          <span className="agency-console-topbar__title">{agency?.name ?? "워크스페이스"}</span>
          <div className="agency-console-topbar__actions">
            <AccountBadge />
            <DemoBadge />
            <RoleSwitcher />
          </div>
        </header>
        <main className="agency-console-main" id="agency-console-main" tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}
```

The comments mark the unchanged parts — apply this diff against the actual current file (`src/components/agency/console/AgencyConsoleShell.tsx`) by only touching the imports, the new `isLoginRoute`/redirect effect, the early return, and the `topbar__actions` line; leave the sidebar/nav JSX exactly as it is today.

- [ ] **Step 12: Run to confirm pass**

```bash
npm test -- src/components/agency/console/AgencyConsoleShell.test.tsx
npm run typecheck
```
Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add src/app/agency/login src/components/agency/AccountBadge.tsx src/components/agency/AccountBadge.test.tsx src/app/agency/layout.tsx src/components/agency/console/AgencyConsoleShell.tsx src/components/agency/console/AgencyConsoleShell.test.tsx src/app/agency/agency-console.css
git commit -m "feat: add agency login page, account badge, and console session gating"
```

---

## Task 14: Role-gate the audition offer button

**Files:**
- Modify: `src/components/agency/TalentReview.tsx`
- Modify: `src/components/agency/TalentReview.test.tsx` (extend existing file — check it first for its render-wrapper helper)
- Modify: `src/app/agency/talent/[id]/page.tsx`

**Interfaces:**
- Consumes: `useAgencySession` (Task 12).
- Produces: `TalentReview` accepts an additional optional prop `isViewOnly?: boolean` (default `false`).

This is the plan's concrete instance of the roadmap's completion criterion ("열람 전용 사용자는 승인·연락·게시 버튼이 비활성이다") applied to the one already-built action that matches it today. Later phases apply the same prop pattern to any new approve/contact/publish controls they add.

- [ ] **Step 1: Write the failing test**

Add to `src/components/agency/TalentReview.test.tsx` (match the file's existing `agency`/`talent` test fixtures — read the top of the file first to reuse them rather than redefining):

```tsx
  it("disables the offer button for a view-only role even when the agency is verified", () => {
    render(
      <TalentReview
        agency={{ ...agency, verification: "verified" }}
        talent={talent}
        isViewOnly
        onCreateOffer={vi.fn()}
        onFavorite={vi.fn()}
        onReview={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "오디션 제안 보내기" })).toBeDisabled();
  });
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- src/components/agency/TalentReview.test.tsx
```
Expected: FAIL — button is enabled (no `isViewOnly` prop exists yet, TypeScript will also flag the unknown prop).

- [ ] **Step 3: Implement**

In `src/components/agency/TalentReview.tsx`, add the prop and use it in both the disabled check and the submit guard:

```tsx
export function TalentReview({
  agency,
  talent,
  isFavorite = false,
  isViewOnly = false,
  onCreateOffer,
  onFavorite,
  onReview,
}: {
  agency: Agency;
  talent: TalentProfile;
  isFavorite?: boolean;
  isViewOnly?: boolean;
  onCreateOffer: (input: OfferInput) => void;
  onFavorite: () => void;
  onReview: () => void;
}) {
  const verified = agency.verification === "verified" && !isViewOnly;
```

(The existing `submit` handler already guards on `!verified`, and the button already uses `disabled={!verified}` — folding `isViewOnly` into the existing `verified` boolean covers both the button and the submit guard with a one-line change, no second condition to keep in sync.)

- [ ] **Step 4: Run to confirm pass**

```bash
npm test -- src/components/agency/TalentReview.test.tsx
```
Expected: PASS, including all pre-existing cases in the file (double-check none of them asserted `verified === true` in a way this change breaks — they should not, since `isViewOnly` defaults to `false`).

- [ ] **Step 5: Wire the real role into the page**

Modify `src/app/agency/talent/[id]/page.tsx`:

```tsx
"use client";

import { notFound, useParams } from "next/navigation";

import { TalentReview } from "@/components/agency/TalentReview";
import { useAgencySession } from "@/features/agency/AgencySessionProvider";
import { useDemo } from "@/features/demo/DemoProvider";

export default function TalentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { state, createOffer, toggleFavorite, moveTalentToReview } = useDemo();
  const { profile } = useAgencySession();
  const talent = state.talents.find((item) => item.id === id);
  const agency = state.agencies.find((item) => item.id === state.activeAgencyId);
  if (!talent || !agency) notFound();
  return (
    <div className="ap-page ap-page--wide">
      <TalentReview
        agency={agency}
        isFavorite={state.favoriteTalentIds.includes(talent.id)}
        isViewOnly={profile?.role === "viewer"}
        talent={talent}
        onCreateOffer={createOffer}
        onFavorite={() => toggleFavorite(talent.id)}
        onReview={() => moveTalentToReview(talent.id)}
      />
    </div>
  );
}
```

`profile` is always `null` outside API mode (Task 12's provider short-circuits), so `profile?.role === "viewer"` is always `false` in demo mode — today's demo behavior is unaffected.

- [ ] **Step 6: Run the full test suite**

```bash
npm test
npm run typecheck
npm run lint
```
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/components/agency/TalentReview.tsx src/components/agency/TalentReview.test.tsx src/app/agency/talent/\[id\]/page.tsx
git commit -m "feat: disable the audition offer action for view-only agency roles"
```

---

## Task 15: Documentation

**Files:**
- Modify: `docs/backend-foundation.md`
- Modify: `docs/enter-ax-upgrade-roadmap-2026-09-30.md`

- [ ] **Step 1: Update `docs/backend-foundation.md`**

Add a new section after "## Multi-tenancy and audit":

```markdown
## Agency staff login

`NEXT_PUBLIC_BACKEND_MODE=api` also enables real agency staff login at `/agency/login`, backed by `tenant_staff_profiles` (email + scrypt password hash) and the existing `tenant_memberships` role table. There is no self-service signup: provision the first account per pilot tenant with `scripts/create-agency-account.mjs` (see its `--help`-style usage message). `TenancyService.requireMembership` is the single place that turns a resolved session into a role or a 403 + `authorization.denied` audit event — every future tenant-scoped endpoint should call it rather than re-checking `tenant_memberships` directly.

### A SECURITY DEFINER gotcha worth remembering

Any new cross-user lookup function (session-by-token, credentials-by-email) must run `SECURITY DEFINER` as `enter_ax_owner`, and `enter_ax_owner` is **not** `BYPASSRLS`. If the table it reads has `FORCE ROW LEVEL SECURITY` and every existing policy is scoped `TO enter_ax_app`, the function will silently return zero rows for everyone — no error, just an empty result — because none of the policies apply to the role the function actually runs as. Add an explicit `FOR SELECT TO enter_ax_owner USING (true)` policy on that table in the same migration that adds the function. `db/migrations/002_fix_session_lookup_rls.sql` fixed this for the original community tables; `db/migrations/003_agency_accounts.sql` did it correctly from the start for `tenant_staff_profiles`.
```

- [ ] **Step 2: Update `docs/enter-ax-upgrade-roadmap-2026-09-30.md`**

In the "검증된 현재 상태" table, change the Phase 2 row from:

```
| 기획사 로그인/역할 (P0-1) | `src/server/identity`, `src/server/tenancy`에 서비스는 있으나 `src/app`에서 미사용 (grep 0건) |
```

to:

```
| 기획사 로그인/역할 (P0-1) | 완료 (2026-09-30) — `docs/superpowers/plans/2026-09-30-agency-tenancy-phase2.md`. 실행 중 `lookup_session`의 RLS 갭도 함께 수정됨(002 마이그레이션). |
```

In §2 "Phase 2 — 기획사 계정·테넌시 배선 (P0-1)", replace the "없는 것" paragraph's content with a short note that the gap is closed and link to the plan file, keeping the "완료 기준" paragraph as-is (it's still the right target for Phase 3 to build resource-level checks against).

- [ ] **Step 3: Commit**

```bash
git add docs/backend-foundation.md docs/enter-ax-upgrade-roadmap-2026-09-30.md
git commit -m "docs: record Phase 2 completion and the SECURITY DEFINER RLS gotcha"
```

---

## Self-Review Notes

- **Spec coverage:** Real login (Tasks 8–13), role from `tenant_memberships` via the already-tested `TenancyService` (Task 9), 403 + audit on denied access (Task 9's revoked-membership test, reusing existing `TenancyService` behavior proven in `tenancy/service.test.ts`), at least one viewer-disabled action (Task 14). Self-service invites and a change-password flow are explicitly out of scope (see Global Constraints) pending the unresolved §0 decision on invite delivery channel — flagged, not silently dropped.
- **Placeholder scan:** no "add validation later" language; every step has real code or a real terminal command with an expected result.
- **Type consistency:** `AgencySession` (Task 5) is the one shape threaded through repository → service → handlers → client `AgencyProfile` (a narrower, public-safe projection without `sessionId`/timestamps, matching how `CommunityViewer` is narrower than `CommunitySession`). `TenantRole` is imported from `@/server/tenancy/repository` everywhere rather than re-declared. Cookie name `AGENCY_SESSION_COOKIE` / `enter_ax_agency_session` is defined once in `agency-handlers.ts` and not duplicated as a string literal anywhere else (client code never reads the cookie directly — it only ever calls the API and reads JSON bodies, matching the `HttpOnly` cookie's whole point).
