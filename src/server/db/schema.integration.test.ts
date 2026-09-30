import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationDescribe = databaseUrl ? describe : describe.skip;
const sql = databaseUrl ? postgres(databaseUrl, { max: 1 }) : null;

integrationDescribe("backend foundation schema", () => {
  afterAll(async () => {
    await sql?.end();
  });

  it("creates the required tables and forces row-level security", async () => {
    const tables = await sql!<{ tablename: string; rowsecurity: boolean; forcerowsecurity: boolean }[]>`
      SELECT c.relname AS tablename, c.relrowsecurity AS rowsecurity, c.relforcerowsecurity AS forcerowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
    `;

    expect(tables.map((table) => table.tablename)).toEqual(
      expect.arrayContaining([
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
      ]),
    );

    const protectedTables = tables
      .filter((table) => table.rowsecurity && table.forcerowsecurity)
      .map((table) => table.tablename);
    expect(protectedTables).toEqual(
      expect.arrayContaining([
        "sessions",
        "community_profiles",
        "community_posts",
        "community_comments",
        "community_reports",
        "tenant_memberships",
        "audit_events",
      ]),
    );
  });

  it("prevents one community author from changing another author's post", async () => {
    const firstUserId = crypto.randomUUID();
    const secondUserId = crypto.randomUUID();

    await sql!.begin(async (transaction) => {
      await transaction`SELECT set_config('app.user_id', ${firstUserId}, true)`;
      await transaction`INSERT INTO users (id) VALUES (${firstUserId})`;
      await transaction`INSERT INTO community_profiles (user_id, nickname) VALUES (${firstUserId}, ${`user-${firstUserId.slice(0, 8)}`})`;
      await transaction`
        INSERT INTO community_posts (author_user_id, category, title, body)
        VALUES (${firstUserId}, 'question', '테스트 제목', '테스트 본문')
      `;
    });

    const updated = await sql!.begin(async (transaction) => {
      await transaction`SELECT set_config('app.user_id', ${secondUserId}, true)`;
      await transaction`INSERT INTO users (id) VALUES (${secondUserId})`;
      await transaction`INSERT INTO community_profiles (user_id, nickname) VALUES (${secondUserId}, ${`user-${secondUserId.slice(0, 8)}`})`;
      return transaction`
        UPDATE community_posts
        SET title = '침범된 제목'
        WHERE author_user_id = ${firstUserId}
        RETURNING id
      `;
    });

    expect(updated).toHaveLength(0);
  });

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

  it("lets enter_ax_app revoke its own session (UPDATE ... WHERE needs SELECT on id, user_id)", async () => {
    const userId = crypto.randomUUID();
    const tokenHash = crypto.randomUUID();
    // Generated application-side, matching how PostgresPlatformRepository actually inserts
    // sessions (createCommunityIdentity/createAgencySession pass an explicit id) — not via
    // `INSERT ... RETURNING`, which triggers a *separate* RLS visibility check (no SELECT
    // policy exists for enter_ax_app on sessions, only the column-level GRANT this migration
    // adds) that production code paths never actually exercise.
    const sessionId = crypto.randomUUID();

    await sql!.begin(async (transaction) => {
      await transaction`SELECT set_config('app.user_id', ${userId}, true)`;
      await transaction`INSERT INTO users (id) VALUES (${userId})`;
      await transaction`INSERT INTO community_profiles (user_id, nickname) VALUES (${userId}, ${`user-${userId.slice(0, 8)}`})`;
      await transaction`
        INSERT INTO sessions (id, user_id, token_hash, expires_at)
        VALUES (${sessionId}, ${userId}, ${tokenHash}, now() + interval '30 days')
      `;
    });

    const updated = await sql!.begin(async (transaction) => {
      await transaction`SELECT set_config('app.user_id', ${userId}, true)`;
      return transaction`
        UPDATE sessions SET revoked_at = now() WHERE id = ${sessionId} AND user_id = ${userId}
      `;
    });

    expect(updated.count).toBe(1);
  });
});
