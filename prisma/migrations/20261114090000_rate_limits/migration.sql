-- M9: fixed-window rate-limit counters shared across serverless instances.
CREATE TABLE "rate_limits" (
    "key" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key"),
    CONSTRAINT "rate_limits_count_check" CHECK ("count" >= 1)
);

CREATE INDEX "rate_limits_window_start_idx" ON "rate_limits"("window_start");
