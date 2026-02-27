-- Enable deny-all RLS on _prisma_migrations table
-- Resolves Supabase security alert: table was publicly accessible via PostgREST
-- No policies added = deny all for anon/authenticated roles
-- Prisma connects as postgres superuser and bypasses RLS automatically
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
