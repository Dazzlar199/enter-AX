import type { Sql } from "postgres";

import { CommunityService } from "@/server/community/service";
import { IdentityService } from "@/server/identity/service";
import { PostgresPlatformRepository } from "@/server/postgres/platform-repository";
import { PostgresRateLimiter } from "@/server/postgres/rate-limit";
import { MemoryRateLimiter } from "@/server/shared/rate-limit";
import { MemoryPlatformRepository } from "@/server/testing/memory-platform";
import { TenancyService } from "@/server/tenancy/service";

import { readServerConfig, type ServerConfig } from "./config";
import { createRuntimeSql } from "./db/client";
import { createAgencyHandlers } from "./http/agency-handlers";
import { createCommunityHandlers } from "./http/community-handlers";

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

let singleton: ReturnType<typeof createServerContainer> | null = null;

export function getServerContainer() {
  singleton ??= createServerContainer({ config: readServerConfig(process.env) });
  return singleton;
}
