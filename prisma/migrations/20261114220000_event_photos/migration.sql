-- Photos per dinner, shown on cards, the dinner page and the past-dinners view.
ALTER TABLE "events" ADD COLUMN "photo_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
