-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "teachers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'teacher',
    "deactivated_at" TIMESTAMP(3),
    "avatar_url" TEXT,
    "subscription_tier" TEXT NOT NULL DEFAULT 'free',
    "stripe_customer_id" TEXT,
    "supabase_auth_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_sessions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "teacher_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_participants" (
    "id" TEXT NOT NULL,
    "fun_name" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "fingerprint" TEXT,
    "recovery_code" TEXT,
    "reroll_used" BOOLEAN NOT NULL DEFAULT false,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "session_id" TEXT NOT NULL,

    CONSTRAINT "student_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brackets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "bracket_type" TEXT NOT NULL DEFAULT 'single_elimination',
    "size" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "viewing_mode" TEXT NOT NULL DEFAULT 'advanced',
    "show_vote_counts" BOOLEAN NOT NULL DEFAULT true,
    "show_seed_numbers" BOOLEAN NOT NULL DEFAULT true,
    "voting_timer_seconds" INTEGER,
    "teacher_id" TEXT NOT NULL,
    "session_id" TEXT,
    "prediction_status" TEXT,
    "round_robin_pacing" TEXT,
    "round_robin_voting_style" TEXT,
    "round_robin_standings_mode" TEXT,
    "predictive_mode" TEXT,
    "predictive_resolution_mode" TEXT,
    "play_in_enabled" BOOLEAN NOT NULL DEFAULT false,
    "max_entrants" INTEGER,
    "revealed_up_to_round" INTEGER,
    "external_tournament_id" TEXT,
    "data_source" TEXT,
    "last_sync_at" TIMESTAMP(3),
    "sport_gender" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brackets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bracket_entrants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "seed_position" INTEGER NOT NULL,
    "bracket_id" TEXT NOT NULL,
    "external_team_id" INTEGER,
    "logo_url" TEXT,
    "abbreviation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bracket_entrants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matchups" (
    "id" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "bracket_id" TEXT NOT NULL,
    "entrant1_id" TEXT,
    "entrant2_id" TEXT,
    "winner_id" TEXT,
    "next_matchup_id" TEXT,
    "bracket_region" TEXT,
    "is_bye" BOOLEAN NOT NULL DEFAULT false,
    "round_robin_round" INTEGER,
    "external_game_id" INTEGER,
    "home_score" INTEGER,
    "away_score" INTEGER,
    "game_status" TEXT,
    "game_start_time" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "matchups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "matchup_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "entrant_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "polls" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "description" TEXT,
    "poll_type" TEXT NOT NULL DEFAULT 'simple',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "allow_vote_change" BOOLEAN NOT NULL DEFAULT true,
    "show_live_results" BOOLEAN NOT NULL DEFAULT false,
    "ranking_depth" INTEGER,
    "teacher_id" TEXT NOT NULL,
    "session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_options" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "image_url" TEXT,
    "position" INTEGER NOT NULL,
    "poll_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_votes" (
    "id" TEXT NOT NULL,
    "poll_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poll_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "stripe_price_id" TEXT NOT NULL,
    "stripe_current_period_end" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predictions" (
    "id" TEXT NOT NULL,
    "bracket_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "matchup_id" TEXT NOT NULL,
    "predicted_winner_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teachers_email_key" ON "teachers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_supabase_auth_id_key" ON "teachers"("supabase_auth_id");

-- CreateIndex
CREATE INDEX "class_sessions_code_status_idx" ON "class_sessions"("code", "status");

-- CreateIndex
CREATE INDEX "student_participants_session_id_fingerprint_idx" ON "student_participants"("session_id", "fingerprint");

-- CreateIndex
CREATE INDEX "student_participants_recovery_code_idx" ON "student_participants"("recovery_code");

-- CreateIndex
CREATE UNIQUE INDEX "student_participants_session_id_device_id_key" ON "student_participants"("session_id", "device_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_participants_session_id_fun_name_key" ON "student_participants"("session_id", "fun_name");

-- CreateIndex
CREATE INDEX "brackets_teacher_id_idx" ON "brackets"("teacher_id");

-- CreateIndex
CREATE INDEX "brackets_session_id_idx" ON "brackets"("session_id");

-- CreateIndex
CREATE INDEX "brackets_status_idx" ON "brackets"("status");

-- CreateIndex
CREATE INDEX "bracket_entrants_bracket_id_idx" ON "bracket_entrants"("bracket_id");

-- CreateIndex
CREATE UNIQUE INDEX "bracket_entrants_bracket_id_seed_position_key" ON "bracket_entrants"("bracket_id", "seed_position");

-- CreateIndex
CREATE INDEX "matchups_bracket_id_idx" ON "matchups"("bracket_id");

-- CreateIndex
CREATE UNIQUE INDEX "matchups_bracket_id_round_position_key" ON "matchups"("bracket_id", "round", "position");

-- CreateIndex
CREATE INDEX "votes_matchup_id_idx" ON "votes"("matchup_id");

-- CreateIndex
CREATE INDEX "votes_participant_id_idx" ON "votes"("participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "votes_matchup_id_participant_id_key" ON "votes"("matchup_id", "participant_id");

-- CreateIndex
CREATE INDEX "polls_teacher_id_idx" ON "polls"("teacher_id");

-- CreateIndex
CREATE INDEX "polls_session_id_idx" ON "polls"("session_id");

-- CreateIndex
CREATE INDEX "polls_status_idx" ON "polls"("status");

-- CreateIndex
CREATE INDEX "poll_options_poll_id_idx" ON "poll_options"("poll_id");

-- CreateIndex
CREATE UNIQUE INDEX "poll_options_poll_id_position_key" ON "poll_options"("poll_id", "position");

-- CreateIndex
CREATE INDEX "poll_votes_poll_id_idx" ON "poll_votes"("poll_id");

-- CreateIndex
CREATE INDEX "poll_votes_participant_id_idx" ON "poll_votes"("participant_id");

-- CreateIndex
CREATE INDEX "poll_votes_option_id_idx" ON "poll_votes"("option_id");

-- CreateIndex
CREATE UNIQUE INDEX "poll_votes_poll_id_participant_id_rank_key" ON "poll_votes"("poll_id", "participant_id", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_teacher_id_key" ON "subscriptions"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "subscriptions_stripe_subscription_id_idx" ON "subscriptions"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "predictions_bracket_id_idx" ON "predictions"("bracket_id");

-- CreateIndex
CREATE INDEX "predictions_participant_id_idx" ON "predictions"("participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "predictions_bracket_id_participant_id_matchup_id_key" ON "predictions"("bracket_id", "participant_id", "matchup_id");

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_participants" ADD CONSTRAINT "student_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brackets" ADD CONSTRAINT "brackets_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brackets" ADD CONSTRAINT "brackets_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "class_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bracket_entrants" ADD CONSTRAINT "bracket_entrants_bracket_id_fkey" FOREIGN KEY ("bracket_id") REFERENCES "brackets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchups" ADD CONSTRAINT "matchups_bracket_id_fkey" FOREIGN KEY ("bracket_id") REFERENCES "brackets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchups" ADD CONSTRAINT "matchups_entrant1_id_fkey" FOREIGN KEY ("entrant1_id") REFERENCES "bracket_entrants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchups" ADD CONSTRAINT "matchups_entrant2_id_fkey" FOREIGN KEY ("entrant2_id") REFERENCES "bracket_entrants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchups" ADD CONSTRAINT "matchups_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "bracket_entrants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchups" ADD CONSTRAINT "matchups_next_matchup_id_fkey" FOREIGN KEY ("next_matchup_id") REFERENCES "matchups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_matchup_id_fkey" FOREIGN KEY ("matchup_id") REFERENCES "matchups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "student_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_entrant_id_fkey" FOREIGN KEY ("entrant_id") REFERENCES "bracket_entrants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polls" ADD CONSTRAINT "polls_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polls" ADD CONSTRAINT "polls_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "class_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "student_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_bracket_id_fkey" FOREIGN KEY ("bracket_id") REFERENCES "brackets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "student_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_matchup_id_fkey" FOREIGN KEY ("matchup_id") REFERENCES "matchups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_predicted_winner_id_fkey" FOREIGN KEY ("predicted_winner_id") REFERENCES "bracket_entrants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

