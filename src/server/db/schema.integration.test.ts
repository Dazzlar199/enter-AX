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
});
