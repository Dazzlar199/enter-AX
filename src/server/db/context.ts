import type { Sql, TransactionSql } from "postgres";

export interface ActorDatabaseContext {
  userId?: string | null;
  tenantId?: string | null;
}

export async function withActorTransaction<T>(
  sql: Sql,
  context: ActorDatabaseContext,
  callback: (transaction: TransactionSql) => Promise<T>,
): Promise<T> {
  const result = await sql.begin(async (transaction) => {
    await transaction`SELECT set_config('app.user_id', ${context.userId ?? ""}, true)`;
    await transaction`SELECT set_config('app.tenant_id', ${context.tenantId ?? ""}, true)`;
    return callback(transaction);
  });
  return result as T;
}
