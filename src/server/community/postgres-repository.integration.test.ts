import postgres from "postgres";
import { afterAll, describe } from "vitest";

import { agencyAccountContract } from "@/server/identity/agency-account.contract";
import { PostgresPlatformRepository } from "@/server/postgres/platform-repository";

import { communityRepositoryContract } from "./repository.contract";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationDescribe = databaseUrl ? describe : describe.skip;
const sql = databaseUrl ? postgres(databaseUrl, { max: 2 }) : null;

integrationDescribe("PostgreSQL community repository", () => {
  afterAll(async () => {
    await sql?.end();
  });
  communityRepositoryContract("postgres repository", async () => new PostgresPlatformRepository(sql!));
  agencyAccountContract("postgres repository", async () => new PostgresPlatformRepository(sql!), async () => {
    const [tenant] = await sql!<{ id: string }[]>`
      INSERT INTO tenants (slug, name, verification_status)
      VALUES (${`agency-contract-${crypto.randomUUID().slice(0, 8)}`}, '테스트 기획사', 'verified')
      RETURNING id
    `;
    return tenant.id;
  });
});
