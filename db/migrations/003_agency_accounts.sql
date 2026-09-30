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
