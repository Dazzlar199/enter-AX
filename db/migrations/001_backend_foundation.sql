CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at) WHERE revoked_at IS NULL;

CREATE TABLE community_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(btrim(nickname)) BETWEEN 2 AND 20)
);

CREATE UNIQUE INDEX community_profiles_active_nickname_idx
  ON community_profiles (lower(nickname))
  WHERE status = 'active';

CREATE TABLE tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE tenant_memberships (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE INDEX tenant_memberships_user_id_idx ON tenant_memberships (user_id, status);

CREATE TABLE community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id uuid NOT NULL REFERENCES community_profiles(user_id) ON DELETE RESTRICT,
  category text NOT NULL CHECK (category IN ('free', 'question', 'success-story', 'information')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 120),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 2 AND 10000),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX community_posts_feed_idx ON community_posts (created_at DESC, id DESC)
  WHERE status = 'published';
CREATE INDEX community_posts_category_feed_idx ON community_posts (category, created_at DESC, id DESC)
  WHERE status = 'published';

CREATE TABLE community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES community_profiles(user_id) ON DELETE RESTRICT,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX community_comments_post_feed_idx
  ON community_comments (post_id, created_at DESC, id DESC)
  WHERE status = 'published';

CREATE TABLE community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 2 AND 500),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX community_reports_open_target_idx
  ON community_reports (reporter_user_id, target_type, target_id)
  WHERE status IN ('open', 'reviewing');

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  action text NOT NULL,
  subject_type text NOT NULL,
  subject_id uuid,
  request_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_actor_idx ON audit_events (actor_user_id, created_at DESC);
CREATE INDEX audit_events_tenant_idx ON audit_events (tenant_id, created_at DESC) WHERE tenant_id IS NOT NULL;

CREATE TABLE rate_limit_buckets (
  key_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  hit_count integer NOT NULL CHECK (hit_count > 0),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (key_hash, window_start)
);

CREATE INDEX rate_limit_buckets_expiry_idx ON rate_limit_buckets (expires_at);

CREATE OR REPLACE FUNCTION lookup_session(p_token_hash text)
RETURNS TABLE (
  session_id uuid,
  user_id uuid,
  expires_at timestamptz,
  revoked_at timestamptz,
  user_status text,
  nickname text,
  profile_status text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT s.id, s.user_id, s.expires_at, s.revoked_at, u.status, p.nickname, p.status
  FROM sessions s
  JOIN users u ON u.id = s.user_id
  JOIN community_profiles p ON p.user_id = s.user_id
  WHERE s.token_hash = p_token_hash
  LIMIT 1
$function$;

REVOKE ALL ON FUNCTION lookup_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lookup_session(text) TO enter_ax_app;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE community_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts FORCE ROW LEVEL SECURITY;
ALTER TABLE community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_comments FORCE ROW LEVEL SECURITY;
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reports FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;

CREATE POLICY users_self_select ON users FOR SELECT TO enter_ax_app
  USING (id = nullif(current_setting('app.user_id', true), '')::uuid);
CREATE POLICY users_self_insert ON users FOR INSERT TO enter_ax_app
  WITH CHECK (id = nullif(current_setting('app.user_id', true), '')::uuid);
CREATE POLICY users_self_update ON users FOR UPDATE TO enter_ax_app
  USING (id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (id = nullif(current_setting('app.user_id', true), '')::uuid);

CREATE POLICY sessions_self_insert ON sessions FOR INSERT TO enter_ax_app
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
CREATE POLICY sessions_self_update ON sessions FOR UPDATE TO enter_ax_app
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

CREATE POLICY community_profiles_active_read ON community_profiles FOR SELECT TO enter_ax_app
  USING (status = 'active' OR user_id = nullif(current_setting('app.user_id', true), '')::uuid);
CREATE POLICY community_profiles_self_insert ON community_profiles FOR INSERT TO enter_ax_app
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
CREATE POLICY community_profiles_self_update ON community_profiles FOR UPDATE TO enter_ax_app
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

CREATE POLICY tenant_memberships_self_read ON tenant_memberships FOR SELECT TO enter_ax_app
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid);

CREATE POLICY community_posts_published_read ON community_posts FOR SELECT TO enter_ax_app
  USING (status = 'published' OR author_user_id = nullif(current_setting('app.user_id', true), '')::uuid);
CREATE POLICY community_posts_self_insert ON community_posts FOR INSERT TO enter_ax_app
  WITH CHECK (author_user_id = nullif(current_setting('app.user_id', true), '')::uuid);
CREATE POLICY community_posts_self_update ON community_posts FOR UPDATE TO enter_ax_app
  USING (author_user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (author_user_id = nullif(current_setting('app.user_id', true), '')::uuid);
CREATE POLICY community_posts_self_delete ON community_posts FOR DELETE TO enter_ax_app
  USING (author_user_id = nullif(current_setting('app.user_id', true), '')::uuid);

CREATE POLICY community_comments_published_read ON community_comments FOR SELECT TO enter_ax_app
  USING (status = 'published' OR author_user_id = nullif(current_setting('app.user_id', true), '')::uuid);
CREATE POLICY community_comments_self_insert ON community_comments FOR INSERT TO enter_ax_app
  WITH CHECK (author_user_id = nullif(current_setting('app.user_id', true), '')::uuid);
CREATE POLICY community_comments_self_update ON community_comments FOR UPDATE TO enter_ax_app
  USING (author_user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (author_user_id = nullif(current_setting('app.user_id', true), '')::uuid);
CREATE POLICY community_comments_self_delete ON community_comments FOR DELETE TO enter_ax_app
  USING (author_user_id = nullif(current_setting('app.user_id', true), '')::uuid);

CREATE POLICY community_reports_self_read ON community_reports FOR SELECT TO enter_ax_app
  USING (reporter_user_id = nullif(current_setting('app.user_id', true), '')::uuid);
CREATE POLICY community_reports_self_insert ON community_reports FOR INSERT TO enter_ax_app
  WITH CHECK (reporter_user_id = nullif(current_setting('app.user_id', true), '')::uuid);

CREATE POLICY audit_events_actor_insert ON audit_events FOR INSERT TO enter_ax_app
  WITH CHECK (
    actor_user_id IS NULL
    OR actor_user_id = nullif(current_setting('app.user_id', true), '')::uuid
  );

GRANT SELECT, INSERT, UPDATE ON users TO enter_ax_app;
GRANT INSERT, UPDATE ON sessions TO enter_ax_app;
GRANT SELECT, INSERT, UPDATE ON community_profiles TO enter_ax_app;
GRANT SELECT ON tenants TO enter_ax_app;
GRANT SELECT ON tenant_memberships TO enter_ax_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_posts TO enter_ax_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON community_comments TO enter_ax_app;
GRANT SELECT, INSERT ON community_reports TO enter_ax_app;
GRANT INSERT ON audit_events TO enter_ax_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limit_buckets TO enter_ax_app;

ALTER FUNCTION lookup_session(text) OWNER TO enter_ax_owner;
