# Enter-AX Backend Foundation Operations

## Runtime modes

`NEXT_PUBLIC_BACKEND_MODE=demo` keeps the existing browser-local demonstration. `api` enables the PostgreSQL-backed community session and community API. Preview should remain in demo mode until migrations and the checks below have completed.

## Local PostgreSQL

```bash
npm run db:up -- --wait
DATABASE_URL=postgres://enter_ax_owner:enter_ax_owner@localhost:54329/enter_ax_test npm run db:migrate
```

The Compose initializer creates two roles:

- `enter_ax_owner`: migration owner; never use it as the web application's runtime connection.
- `enter_ax_app`: non-owner runtime role without `BYPASSRLS`.

**These exact role names are a hard requirement, not a suggestion.** Migrations `002` and `003` hard-code the literal role names `enter_ax_owner` and `enter_ax_app` (in `GRANT`/policy statements and `SECURITY DEFINER` function ownership) — they do not read the names from a variable. On any managed PostgreSQL provider where the database's default owner role is named something else (e.g. `postgres`, or a provider-generated admin user), migrations must still run as a role literally named `enter_ax_owner`, and the application's runtime connection must use a role literally named `enter_ax_app`, exactly matching `db/init/001-roles.sql`. If you provision managed Postgres, create these two roles first (with the same privilege split `001-roles.sql` sets up locally) before running migrations — do not substitute the provider's own admin role name, or migrations will either fail outright or silently scope RLS policies to a role nothing ever connects as (see "A SECURITY DEFINER gotcha worth remembering" below for what that failure mode looks like).

Use this runtime URL locally:

```dotenv
DATABASE_URL=postgres://enter_ax_app:enter_ax_app@localhost:54329/enter_ax_test
```

Stop the container without deleting its named volume:

```bash
npm run db:down
```

## Tests

Unit tests skip PostgreSQL integration only when `TEST_DATABASE_URL` is absent. To exercise schema, RLS, repository, and shared rate-limit behavior:

```bash
TEST_DATABASE_URL=postgres://enter_ax_app:enter_ax_app@localhost:54329/enter_ax_test npm test -- src/server
```

The schema test proves that forced RLS is enabled and that one user cannot modify another user's community post. Repository contract tests run the same behaviors against memory and PostgreSQL adapters.

## Session security

Community sessions use a 256-bit opaque token. Only its SHA-256 hash is stored. The browser cookie is `HttpOnly`, `SameSite=Lax`, scoped to `/`, and lasts 30 days. Production API mode refuses to start unless `SESSION_COOKIE_SECURE=true`.

Cookie-authenticated mutations also require `Origin` to equal `APP_ORIGIN`. Reverse proxies must preserve `Origin` and supply a trustworthy client IP in `X-Forwarded-For` for session creation rate limiting.

## Multi-tenancy and audit

The runtime connection sets `app.user_id` and `app.tenant_id` inside the same transaction that performs protected queries. Never move those settings to a pooled connection outside a transaction. Tenant membership checks remain an application guard in addition to RLS.

Audit records are append-only from the runtime role. Metadata may contain IDs, category slugs, or required roles, but must not include tokens, post bodies, comment bodies, report reasons, or connector secrets.

## Agency staff login

`NEXT_PUBLIC_BACKEND_MODE=api` also enables real agency staff login at `/agency/login`, backed by `tenant_staff_profiles` (email + scrypt password hash, `db/migrations/003_agency_accounts.sql`) and the existing `tenant_memberships` role table. There is no self-service signup: provision the first account per pilot tenant with `scripts/create-agency-account.mjs` (see its `--help`-style usage message). Login sets an `enter_ax_agency_session` cookie, distinct from the community session cookie. `TenancyService.requireMembership` is the single place that turns a resolved session into a role or a 403 + `authorization.denied` audit event — this logic already existed and was already tested before this work; what changed is that real HTTP callers (`/agency/login`, the agency console shell) now actually go through it for the first time. Every future tenant-scoped endpoint should call it rather than re-checking `tenant_memberships` directly.

`scripts/create-agency-account.mjs` must be run with `DATABASE_URL` set to the **`enter_ax_app`** runtime role, not `enter_ax_owner` — it relies on the row-level-security-scoped INSERT grants migration `003` gives `enter_ax_app` on `tenants`, `tenant_staff_profiles`, and `tenant_memberships`, and inherits `app.user_id`/`app.tenant_id` session-variable behavior the same way the running application does.

**Known gap: the "temporary password" the script prints is effectively permanent.** `scripts/create-agency-account.mjs` generates and prints a random password and labels it "temporary password," but there is no change-password, reset-password, or rotation flow anywhere in this phase — this is an explicit, deliberate scope cut, not an oversight. In practice, whatever the script prints at account-creation time is the account's password until an operator manually re-runs some future rotation process (which does not exist yet). Treat the "temporary" label as aspirational: share it with the pilot agency over a secure channel as you would any long-lived credential, and track building a real password-change flow as a known gap for a future phase before this goes beyond a small pilot.

### A SECURITY DEFINER gotcha worth remembering

Any new cross-user lookup function (session-by-token, credentials-by-email) must run `SECURITY DEFINER` as `enter_ax_owner`, and `enter_ax_owner` is **not** `BYPASSRLS`. If the table it reads has `FORCE ROW LEVEL SECURITY` and every existing policy is scoped `TO enter_ax_app`, the function will silently return zero rows for everyone — no error, just an empty result — because none of the policies apply to the role the function actually runs as. Add an explicit `FOR SELECT TO enter_ax_owner USING (true)` policy on that table in the same migration that adds the function.

This is not a hypothetical: building real agency login against a real local PostgreSQL instance (rather than the in-memory repository double used by most unit tests) surfaced that the community login/logout paths shipped in an earlier phase had never actually worked against real Postgres. Four concrete bugs, all pre-existing and unrelated to anything new added by this work:

- **`lookup_session()` returned zero rows for every call.** It is `SECURITY DEFINER` owned by `enter_ax_owner`, but `users`, `sessions`, and `community_profiles` all have `FORCE ROW LEVEL SECURITY`, and every existing SELECT policy on them was scoped `TO enter_ax_app` only — none applied to the function's actual execution role. This meant community login could never resolve a session against real Postgres; it only ever worked against the in-memory test double. Fixed by `db/migrations/002_fix_session_lookup_rls.sql`, which adds owner-scoped `FOR SELECT TO enter_ax_owner USING (true)` policies. `db/migrations/003_agency_accounts.sql`'s `lookup_agency_session`/`lookup_agency_credentials` functions applied this lesson from the start rather than needing a retrofit.
- **`revokeSession()` — used by both community and agency logout — also never worked against real Postgres.** `sessions` was granted only `INSERT, UPDATE` to `enter_ax_app` (no `SELECT`), and Postgres requires SELECT privilege on any column referenced in an UPDATE's WHERE clause. `db/migrations/004_fix_sessions_select_grant.sql` granted `SELECT (id, user_id)`. That alone was still insufficient: `sessions` had `FORCE ROW LEVEL SECURITY` and no SELECT policy applicable to `enter_ax_app`, so the UPDATE still matched zero rows. `db/migrations/005_fix_sessions_select_policy.sql` added a `sessions_self_select` policy mirroring the existing self-scoped insert/update policies. Until both migrations landed, logout silently no-op'd against real Postgres for both community and agency sessions.
- **The shared `agencyAccountContract` test fabricated a `tenantId` via `crypto.randomUUID()` with no real `tenants` row behind it.** Harmless against the in-memory repository (no foreign-key enforcement), but `tenant_staff_profiles.tenant_id` has a genuine FK to `tenants(id)`, so the same test violated it against real Postgres. Not an RLS/GRANT issue like the other three — a test-fixture gap, only caught because the contract runs against both backends. Fixed by parameterizing tenant creation: `agencyAccountContract` now takes a `createTenantId: () => Promise<string>` callback; the memory-backed test still passes a bare `crypto.randomUUID()`, while the Postgres-backed test inserts a real `tenants` row and returns its id (`src/server/identity/agency-account.contract.ts`, wired from `src/server/community/memory-repository.test.ts` and `postgres-repository.integration.test.ts`).
- A related, non-RLS grant bug in the same vein: an idempotent-upsert operator script (`scripts/create-agency-account.mjs`) using `INSERT ... ON CONFLICT (slug) DO UPDATE` failed with "permission denied for table tenants," because Postgres requires UPDATE privilege to plan an `ON CONFLICT DO UPDATE` even when no conflict fires, and `enter_ax_app` only ever had SELECT+INSERT on `tenants`. Fixed at the script level (`ON CONFLICT DO NOTHING` + a fallback `SELECT`) rather than widening the runtime role's grants.

All four fixes are verified against a real local PostgreSQL instance, not just the in-memory double, and are covered by regression tests in `src/server/db/schema.integration.test.ts` and the shared `agencyAccountContract` (run against both the memory and PostgreSQL repository backends). The practical lesson: any behavior that only the in-memory repository double has exercised should be treated as unverified until it has also run once against real Postgres with `TEST_DATABASE_URL` set (see "Tests" above).

## Preview rollout

1. Provision a PostgreSQL database in the same or nearest region as the Next.js functions.
2. Create separate owner and non-owner runtime credentials.
3. Run migrations once with the owner URL.
4. Run integration tests against a disposable Preview database using the runtime role.
5. Configure `DATABASE_URL`, `APP_ORIGIN`, and `SESSION_COOKIE_SECURE=true`.
6. Switch Preview to `NEXT_PUBLIC_BACKEND_MODE=api`.
7. Verify session creation, posting, comments, reports, rate limits, authorization denials, and audit records.
8. Run `scripts/create-agency-account.mjs` against the Preview database (using the `enter_ax_app` `DATABASE_URL`, per above) to provision a pilot tenant's first agency account, then verify agency login and logout end to end at `/agency/login`: sign in with the printed credentials, confirm the console loads and `TenancyService.requireMembership` gates role-restricted actions as expected, then sign out and confirm the session cookie is revoked (re-using the page requires signing in again).
9. Enable Production only after moderation operations have an assigned owner.

Rollback does not require deleting data: set `NEXT_PUBLIC_BACKEND_MODE=demo` and redeploy. Keep the database intact for diagnosis.

## Current moderation boundary

This foundation accepts reports and records audit events, but it does not yet provide an administrator moderation UI. Before a public launch, add a restricted review queue for hiding/removing content, resolving reports, suspending profiles, and recording moderator reasons.

## Deferred systems

- OAuth and verified applicant identity providers
- guardian verification and consent ledger
- audition applications, offers, and visibility grants
- direct-to-object-storage media uploads and asynchronous media workers
- Hermes execution, connector secrets, approvals, and workflow versions
