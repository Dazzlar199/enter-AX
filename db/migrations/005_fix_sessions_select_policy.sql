-- Migration 004 granted enter_ax_app column-level SELECT on sessions(id, user_id), which
-- clears the "permission denied" error for revokeSession()'s `UPDATE ... WHERE id = ... AND
-- user_id = ...`. That GRANT alone is not sufficient, though: sessions has FORCE ROW LEVEL
-- SECURITY and, until now, no SELECT policy applicable to enter_ax_app at all (only
-- sessions_self_insert / sessions_self_update, each scoped to its own command). Without a
-- matching SELECT policy, Postgres's row-visibility scan for the UPDATE's WHERE clause finds
-- zero candidate rows — the UPDATE runs without error but silently matches nothing, which is
-- how this was discovered: the permission-denied error was gone, but revoked_at never got set.
--
-- This policy mirrors the existing sessions_self_insert / sessions_self_update predicate
-- exactly. It does not widen what's readable: migration 004's GRANT covers only id and
-- user_id, so token_hash/expires_at/revoked_at/created_at remain unreadable to enter_ax_app
-- via direct SELECT regardless of this policy.
CREATE POLICY sessions_self_select ON sessions FOR SELECT TO enter_ax_app
  USING (user_id = nullif(current_setting('app.user_id', true), '')::uuid);
