/* Postgres-backed: needs TEST_DATABASE_URL (migrated). Skipped otherwise. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPrismaClient, type Db } from "@/lib/db";
import { enforceRateLimit, pruneRateLimits, rateLimit } from "./rate-limit";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("rateLimit against Postgres", () => {
  let db: Db;
  const tag = `rl-${Date.now()}`;
  const rule = { limit: 3, windowSeconds: 60 };
  const t0 = new Date("2026-11-14T12:00:00Z");

  beforeAll(() => {
    db = createPrismaClient(url);
  });
  afterAll(async () => {
    await db.rateLimit.deleteMany({ where: { key: { startsWith: tag } } });
    await db.$disconnect();
  });

  it("allows up to the limit in a window, then refuses with a retry time", async () => {
    const key = `${tag}:a`;
    for (let i = 1; i <= 3; i++) expect(await rateLimit(db, key, rule, t0)).toMatchObject({ ok: true, count: i, retryAfterSeconds: 0 });
    const fourth = await rateLimit(db, key, rule, new Date(t0.getTime() + 10_000));
    expect(fourth).toMatchObject({ ok: false, count: 4, retryAfterSeconds: 50 });
    await expect(enforceRateLimit(db, key, rule, new Date(t0.getTime() + 20_000))).rejects.toMatchObject({ retryAfterSeconds: 40 });
  });

  it("starts a fresh window once the old one lapses", async () => {
    const key = `${tag}:b`;
    for (let i = 0; i < 4; i++) await rateLimit(db, key, rule, t0);
    expect((await rateLimit(db, key, rule, t0)).ok).toBe(false);
    expect(await rateLimit(db, key, rule, new Date(t0.getTime() + 61_000))).toMatchObject({ ok: true, count: 1 });
  });

  it("counts concurrent hits exactly", async () => {
    const key = `${tag}:c`;
    const results = await Promise.all(Array.from({ length: 10 }, () => rateLimit(db, key, rule, t0)));
    expect(results.filter((r) => r.ok)).toHaveLength(3);
    expect(Math.max(...results.map((r) => r.count))).toBe(10);
  });

  it("keeps keys apart", async () => {
    await rateLimit(db, `${tag}:d1`, rule, t0);
    expect((await rateLimit(db, `${tag}:d2`, rule, t0)).count).toBe(1);
  });

  it("prunes only stale windows", async () => {
    await rateLimit(db, `${tag}:old`, rule, new Date(t0.getTime() - 3 * 24 * 3600 * 1000));
    await rateLimit(db, `${tag}:new`, rule, t0);
    const removed = await pruneRateLimits(db, t0);
    expect(removed).toBeGreaterThanOrEqual(1);
    expect(await db.rateLimit.findUnique({ where: { key: `${tag}:old` } })).toBeNull();
    expect(await db.rateLimit.findUnique({ where: { key: `${tag}:new` } })).not.toBeNull();
  });
});
