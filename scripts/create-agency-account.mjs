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

    let [tenant] = await transaction`
      INSERT INTO tenants (slug, name, verification_status)
      VALUES (${tenantSlug}, ${tenantName}, 'verified')
      ON CONFLICT (slug) DO NOTHING
      RETURNING id
    `;
    if (!tenant) {
      [tenant] = await transaction`SELECT id FROM tenants WHERE slug = ${tenantSlug}`;
    }
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
