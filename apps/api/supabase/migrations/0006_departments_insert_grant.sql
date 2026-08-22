-- Companion to 0005_departments_self_serve_insert.sql's RLS policy — an RLS
-- policy alone can't unlock access the underlying role was never granted at
-- all (see 0002_grants.sql's comment). 0002 only ever granted `select` on
-- `departments` since it had no insert policy at the time; now that 0005
-- gives authenticated users a scoped insert policy, the base privilege has
-- to exist too, same as universities' own self-serve-insert grant.
grant insert on departments to authenticated;
