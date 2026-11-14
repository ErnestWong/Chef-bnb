-- M7: the go/no-go job decides each event exactly once and records when it looked.
-- (Address reveal and review requests already have their marker columns.)
ALTER TABLE "events" ADD COLUMN "go_no_go_checked_at" TIMESTAMP(3);

-- Due-row scans for the hourly jobs.
CREATE INDEX "events_status_go_no_go_at_idx" ON "events"("status", "go_no_go_at");
CREATE INDEX "bookings_status_address_sent_at_idx" ON "bookings"("status", "address_sent_at");
CREATE INDEX "bookings_status_review_requested_at_idx" ON "bookings"("status", "review_requested_at");
