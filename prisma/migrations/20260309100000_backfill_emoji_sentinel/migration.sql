-- Backfill: assign 'question' sentinel to participants with null emoji.
-- These are pre-existing participants from before emoji selection was introduced.
-- The sentinel triggers the one-time emoji migration picker on next sign-in.
UPDATE "student_participants" SET "emoji" = 'question' WHERE "emoji" IS NULL;
