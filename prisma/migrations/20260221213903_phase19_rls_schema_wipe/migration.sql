-- Phase 19: Data Wipe (preserve teachers and subscriptions)
-- Wipe in dependency order: children first, then parents
TRUNCATE TABLE public.predictions CASCADE;
TRUNCATE TABLE public.votes CASCADE;
TRUNCATE TABLE public.poll_votes CASCADE;
TRUNCATE TABLE public.poll_options CASCADE;
TRUNCATE TABLE public.matchups CASCADE;
TRUNCATE TABLE public.bracket_entrants CASCADE;
TRUNCATE TABLE public.student_participants CASCADE;
TRUNCATE TABLE public.polls CASCADE;
TRUNCATE TABLE public.brackets CASCADE;
TRUNCATE TABLE public.class_sessions CASCADE;

-- Phase 19: Schema Changes (add first_name, make device_id nullable, add index)
-- AlterTable
ALTER TABLE "student_participants" ADD COLUMN "first_name" VARCHAR(50) NOT NULL;
ALTER TABLE "student_participants" ALTER COLUMN "device_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "student_participants_session_id_first_name_idx" ON "student_participants"("session_id", "first_name");

-- Phase 19: Enable deny-all RLS on all 12 public tables
-- PostgreSQL default: RLS enabled with no policies = deny all for non-superuser roles
-- Prisma connects as postgres (superuser) and bypasses RLS automatically
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bracket_entrants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
