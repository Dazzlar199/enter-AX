-- lookup_session() is SECURITY DEFINER, owned by enter_ax_owner. enter_ax_owner is not
-- BYPASSRLS, and users/sessions/community_profiles all have FORCE ROW LEVEL SECURITY, so
-- the function's own reads are subject to RLS too. The existing policies on these tables
-- are all scoped `TO enter_ax_app`, so none of them apply when the function runs as
-- enter_ax_owner — the join returns zero rows for every token, always.
--
-- These new policies are scoped `TO enter_ax_owner` only — a role enter_ax_app never
-- runs as — so they do not widen enter_ax_app's own direct access to these tables
-- (whatever enter_ax_app is separately GRANTed on each table is unaffected); they only
-- unblock the SECURITY DEFINER function path described above.

CREATE POLICY users_owner_lookup ON users FOR SELECT TO enter_ax_owner USING (true);
CREATE POLICY sessions_owner_lookup ON sessions FOR SELECT TO enter_ax_owner USING (true);
CREATE POLICY community_profiles_owner_lookup ON community_profiles FOR SELECT TO enter_ax_owner USING (true);
