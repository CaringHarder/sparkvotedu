-- AlterTable: Add emoji identity columns to StudentParticipant
ALTER TABLE "student_participants" ADD COLUMN "emoji" VARCHAR(20);
ALTER TABLE "student_participants" ADD COLUMN "last_initial" VARCHAR(2);

-- CreateIndex: Compound index for name-based lookup
CREATE INDEX "student_participants_session_id_first_name_last_initial_idx" ON "student_participants"("session_id", "first_name", "last_initial");
