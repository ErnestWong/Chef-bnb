-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('GUEST', 'CHEF', 'ADMIN');

-- CreateEnum
CREATE TYPE "Borough" AS ENUM ('MANHATTAN', 'BROOKLYN', 'QUEENS', 'BRONX', 'STATEN_ISLAND');

-- CreateEnum
CREATE TYPE "ChefStatus" AS ENUM ('APPLIED', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VenueType" AS ENUM ('CHEF_HOME', 'PARTNER_VENUE');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "EventMode" AS ENUM ('UNSOLD', 'OPEN', 'BOUGHT_OUT');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('SEAT', 'GROUP', 'BUYOUT');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'EXPIRED', 'CANCELLED', 'ATTENDED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "name" TEXT,
    "image" TEXT,
    "phone" TEXT,
    "roles" "Role"[] DEFAULT ARRAY['GUEST']::"Role"[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chef_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "credentials" TEXT,
    "website" TEXT,
    "instagram" TEXT,
    "home_borough" "Borough",
    "status" "ChefStatus" NOT NULL DEFAULT 'APPLIED',
    "food_cert_number" TEXT,
    "insurance_on_file" BOOLEAN NOT NULL DEFAULT false,
    "needs_foh" BOOLEAN NOT NULL DEFAULT false,
    "needs_servers" BOOLEAN NOT NULL DEFAULT false,
    "needs_venue" BOOLEAN NOT NULL DEFAULT false,
    "payment_handle" TEXT,
    "payment_note" TEXT,
    "photo_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chef_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuisines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "cuisines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus" (
    "id" TEXT NOT NULL,
    "chef_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "courses" JSONB NOT NULL DEFAULT '[]',
    "pdf_url" TEXT,
    "is_sample" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "type" "VenueType" NOT NULL DEFAULT 'CHEF_HOME',
    "address" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "borough" "Borough" NOT NULL,
    "cross_streets" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "capacity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "chef_id" TEXT NOT NULL,
    "venue_id" TEXT NOT NULL,
    "menu_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "duration_min" INTEGER NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "min_guests" INTEGER NOT NULL,
    "max_guests" INTEGER NOT NULL,
    "allowed_booking_types" "BookingType"[],
    "go_no_go_at" TIMESTAMP(3) NOT NULL,
    "mode" "EventMode" NOT NULL DEFAULT 'UNSOLD',
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "borough" "Borough" NOT NULL,
    "byob" BOOLEAN NOT NULL DEFAULT true,
    "byob_note" TEXT,
    "dietary_notes" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "guest_user_id" TEXT NOT NULL,
    "type" "BookingType" NOT NULL,
    "party_size" INTEGER NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "platform_fee_cents" INTEGER NOT NULL DEFAULT 0,
    "status" "BookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "dietary_notes" TEXT,
    "paid_marked_at" TIMESTAMP(3),
    "address_sent_at" TIMESTAMP(3),
    "review_requested_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_log" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "from_status" "BookingStatus",
    "to_status" "BookingStatus" NOT NULL,
    "actor_user_id" TEXT,
    "note" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "chef_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT true,
    "removed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ChefProfileToCuisine" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ChefProfileToCuisine_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CuisineToEvent" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CuisineToEvent_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "chef_profiles_user_id_key" ON "chef_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "chef_profiles_slug_key" ON "chef_profiles"("slug");

-- CreateIndex
CREATE INDEX "chef_profiles_status_idx" ON "chef_profiles"("status");

-- CreateIndex
CREATE UNIQUE INDEX "cuisines_name_key" ON "cuisines"("name");

-- CreateIndex
CREATE UNIQUE INDEX "cuisines_slug_key" ON "cuisines"("slug");

-- CreateIndex
CREATE INDEX "menus_chef_id_idx" ON "menus"("chef_id");

-- CreateIndex
CREATE INDEX "venues_owner_user_id_idx" ON "venues"("owner_user_id");

-- CreateIndex
CREATE INDEX "events_starts_at_status_idx" ON "events"("starts_at", "status");

-- CreateIndex
CREATE INDEX "events_borough_idx" ON "events"("borough");

-- CreateIndex
CREATE INDEX "events_chef_id_idx" ON "events"("chef_id");

-- CreateIndex
CREATE INDEX "bookings_event_id_status_idx" ON "bookings"("event_id", "status");

-- CreateIndex
CREATE INDEX "bookings_guest_user_id_status_idx" ON "bookings"("guest_user_id", "status");

-- CreateIndex
CREATE INDEX "bookings_status_created_at_idx" ON "bookings"("status", "created_at");

-- CreateIndex
CREATE INDEX "booking_log_booking_id_at_idx" ON "booking_log"("booking_id", "at");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_booking_id_key" ON "reviews"("booking_id");

-- CreateIndex
CREATE INDEX "reviews_chef_id_created_at_idx" ON "reviews"("chef_id", "created_at");

-- CreateIndex
CREATE INDEX "reviews_event_id_idx" ON "reviews"("event_id");

-- CreateIndex
CREATE INDEX "_ChefProfileToCuisine_B_index" ON "_ChefProfileToCuisine"("B");

-- CreateIndex
CREATE INDEX "_CuisineToEvent_B_index" ON "_CuisineToEvent"("B");

-- AddForeignKey
ALTER TABLE "chef_profiles" ADD CONSTRAINT "chef_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_chef_id_fkey" FOREIGN KEY ("chef_id") REFERENCES "chef_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venues" ADD CONSTRAINT "venues_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_chef_id_fkey" FOREIGN KEY ("chef_id") REFERENCES "chef_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_guest_user_id_fkey" FOREIGN KEY ("guest_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_log" ADD CONSTRAINT "booking_log_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_log" ADD CONSTRAINT "booking_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_chef_id_fkey" FOREIGN KEY ("chef_id") REFERENCES "chef_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChefProfileToCuisine" ADD CONSTRAINT "_ChefProfileToCuisine_A_fkey" FOREIGN KEY ("A") REFERENCES "chef_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChefProfileToCuisine" ADD CONSTRAINT "_ChefProfileToCuisine_B_fkey" FOREIGN KEY ("B") REFERENCES "cuisines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CuisineToEvent" ADD CONSTRAINT "_CuisineToEvent_A_fkey" FOREIGN KEY ("A") REFERENCES "cuisines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CuisineToEvent" ADD CONSTRAINT "_CuisineToEvent_B_fkey" FOREIGN KEY ("B") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Constraints enforced in the database, not just the app (docs/strategy.md, Data model).
ALTER TABLE "events"
  ADD CONSTRAINT "events_max_guests_cap" CHECK ("max_guests" <= 10),
  ADD CONSTRAINT "events_min_max_guests" CHECK ("min_guests" >= 1 AND "min_guests" <= "max_guests"),
  ADD CONSTRAINT "events_price_nonnegative" CHECK ("price_cents" >= 0),
  ADD CONSTRAINT "events_duration_positive" CHECK ("duration_min" > 0);

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_party_size_positive" CHECK ("party_size" >= 1),
  ADD CONSTRAINT "bookings_amount_nonnegative" CHECK ("amount_cents" >= 0 AND "platform_fee_cents" >= 0);

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_rating_range" CHECK ("rating" BETWEEN 1 AND 5);

ALTER TABLE "venues"
  ADD CONSTRAINT "venues_capacity_positive" CHECK ("capacity" >= 1);
