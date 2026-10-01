import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to run database migrations.");
}

const migrationsDirectory = path.join(process.cwd(), "db", "migrations");
const sql = postgres(databaseUrl, { max: 1 });

try {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  const files = (await readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith(".sql"))
    .sort();

  for (const filename of files) {
    const [existing] = await sql`SELECT filename FROM schema_migrations WHERE filename = ${filename}`;
    if (existing) continue;

    const source = await readFile(path.join(migrationsDirectory, filename), "utf8");
    await sql.begin(async (transaction) => {
      await transaction.unsafe(source);
      await transaction`INSERT INTO schema_migrations (filename) VALUES (${filename})`;
    });
    process.stdout.write(`Applied ${filename}\n`);
  }
} finally {
  await sql.end();
}
