-- AlterTable
ALTER TABLE "class_sessions" ADD COLUMN     "archived_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "class_sessions_teacher_id_archived_at_idx" ON "class_sessions"("teacher_id", "archived_at");
