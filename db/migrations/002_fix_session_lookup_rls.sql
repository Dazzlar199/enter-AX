-- lookup_session() is SECURITY DEFINER, owned by enter_ax_owner. enter_ax_owner is not
-- BYPASSRLS, and users/sessions/community_profiles all have FORCE ROW LEVEL SECURITY, so
-- the function's own reads are subject to RLS too. The existing policies on these tables
-- are all scoped `TO enter_ax_app`, so none of them apply when the function runs as
-- enter_ax_owner — the join returns zero rows for every token, always.
--
-- enter_ax_app has no direct GRANT SELECT on any of these three tables (see 001's GRANT
-- list), so these owner-scoped policies do not add any new direct read access for
-- enter_ax_app; they only unblock the SECURITY DEFINER function path.

CREATE POLICY users_owner_lookup ON users FOR SELECT TO enter_ax_owner USING (true);
CREATE POLICY sessions_owner_lookup ON sessions FOR SELECT TO enter_ax_owner USING (true);
CREATE POLICY community_profiles_owner_lookup ON community_profiles FOR SELECT TO enter_ax_owner USING (true);
