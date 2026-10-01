import postgres, { type Sql } from "postgres";

export function createRuntimeSql(databaseUrl: string): Sql {
  return postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}
