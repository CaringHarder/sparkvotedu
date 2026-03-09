-- Migration: Remove fingerprint column from student_participants
-- Phase 43: FingerprintJS Removal
-- Applied via: prisma db push (not migrate dev -- Supabase shadow DB RLS conflict)

-- Drop the index first
DROP INDEX IF EXISTS "student_participants_session_id_fingerprint_idx";

-- Drop the column
ALTER TABLE "student_participants" DROP COLUMN IF EXISTS "fingerprint";
