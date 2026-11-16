-- Shared spaces and open nights (docs/strategy.md, "Shared spaces and open nights", 2026-11-16).
-- Additive and backward compatible: Preview and Production share one database and
-- every build runs `prisma migrate deploy`, so the code still on production must keep
-- working after this runs. `needs_venue` stays (kept in sync) until a later migration.
-- CreateEnum
CREATE TYPE "EventFormat" AS ENUM ('HOME', 'ROOM');

-- CreateEnum
CREATE TYPE "HostingPath" AS ENUM ('HOME', 'OWN_SPACE', 'OPEN_NIGHTS');

-- CreateEnum
CREATE TYPE "OpenNightStatus" AS ENUM ('OPEN', 'TAKEN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PitchStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'WITHDRAWN');

-- AlterEnum
ALTER TYPE "VenueType" ADD VALUE 'CHEF_SPACE';

-- AlterTable
ALTER TABLE "chef_profiles" ADD COLUMN     "hosting_path" "HostingPath" NOT NULL DEFAULT 'HOME';

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "credits" TEXT,
ADD COLUMN     "format" "EventFormat" NOT NULL DEFAULT 'HOME',
ADD COLUMN     "open_night_id" TEXT;

-- AlterTable
ALTER TABLE "venues" ADD COLUMN     "description" TEXT,
ADD COLUMN     "has_bar" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kitchen_notes" TEXT,
ADD COLUMN     "name" TEXT,
ALTER COLUMN "owner_user_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "open_nights" (
    "id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "duration_min" INTEGER NOT NULL DEFAULT 180,
    "min_seats" INTEGER NOT NULL,
    "max_seats" INTEGER NOT NULL,
    "venue_share_pct" INTEGER NOT NULL DEFAULT 0,
    "venue_fee_cents" INTEGER NOT NULL DEFAULT 0,
    "terms" TEXT,
    "suggested_price_cents" INTEGER,
    "crew" TEXT,
    "status" "OpenNightStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "open_nights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "night_pitches" (
    "id" TEXT NOT NULL,
    "open_night_id" TEXT NOT NULL,
    "chef_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "pitch" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "max_guests" INTEGER NOT NULL,
    "status" "PitchStatus" NOT NULL DEFAULT 'PENDING',
    "decision_note" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "night_pitches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "open_nights_status_starts_at_idx" ON "open_nights"("status", "starts_at");

-- CreateIndex
CREATE INDEX "open_nights_venue_id_idx" ON "open_nights"("venue_id");

-- CreateIndex
CREATE INDEX "night_pitches_status_idx" ON "night_pitches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "night_pitches_open_night_id_chef_id_key" ON "night_pitches"("open_night_id", "chef_id");

-- CreateIndex
CREATE UNIQUE INDEX "events_open_night_id_key" ON "events"("open_night_id");

-- AddForeignKey
ALTER TABLE "open_nights" ADD CONSTRAINT "open_nights_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "night_pitches" ADD CONSTRAINT "night_pitches_open_night_id_fkey" FOREIGN KEY ("open_night_id") REFERENCES "open_nights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "night_pitches" ADD CONSTRAINT "night_pitches_chef_id_fkey" FOREIGN KEY ("chef_id") REFERENCES "chef_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_open_night_id_fkey" FOREIGN KEY ("open_night_id") REFERENCES "open_nights"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill "Where will you cook?" from the old yes/no.
UPDATE "chef_profiles" SET "hosting_path" = 'OPEN_NIGHTS' WHERE "needs_venue";

-- The 10-guest cap and BYOB now apply to HOME dinners only; a ROOM seats what the venue holds.
ALTER TABLE "events" DROP CONSTRAINT "events_max_guests_cap";
ALTER TABLE "events"
  ADD CONSTRAINT "events_home_guest_cap" CHECK ("format" <> 'HOME' OR "max_guests" <= 10),
  ADD CONSTRAINT "events_home_byob" CHECK ("format" <> 'HOME' OR "byob");

-- Every venue has an owner except the rooms Covers books.
ALTER TABLE "venues"
  ADD CONSTRAINT "venues_owner_unless_partner" CHECK ("owner_user_id" IS NOT NULL OR "type" = 'PARTNER_VENUE');

ALTER TABLE "open_nights"
  ADD CONSTRAINT "open_nights_seat_range" CHECK ("min_seats" >= 1 AND "min_seats" <= "max_seats"),
  ADD CONSTRAINT "open_nights_share_range" CHECK ("venue_share_pct" BETWEEN 0 AND 100),
  ADD CONSTRAINT "open_nights_fee_nonnegative" CHECK ("venue_fee_cents" >= 0),
  ADD CONSTRAINT "open_nights_duration_positive" CHECK ("duration_min" > 0),
  ADD CONSTRAINT "open_nights_price_nonnegative" CHECK ("suggested_price_cents" IS NULL OR "suggested_price_cents" >= 0);

ALTER TABLE "night_pitches"
  ADD CONSTRAINT "night_pitches_price_nonnegative" CHECK ("price_cents" >= 0),
  ADD CONSTRAINT "night_pitches_max_guests_positive" CHECK ("max_guests" >= 1);
