import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { runJobs } = vi.hoisted(() => ({ runJobs: vi.fn(async () => ({ ranAt: "2026-11-13T13:00:00.000Z", jobs: {} })) }));
vi.mock("@/lib/jobs/run-jobs", () => ({ runJobs }));
vi.mock("@/lib/db", () => ({ getDb: () => ({}) }));
vi.mock("@/lib/email/mailer", () => ({ getMailer: () => ({ transport: { name: "memory" } }) }));

import { GET, POST } from "./route";

const req = (auth?: string) => new Request("http://localhost/api/cron", { headers: auth ? { authorization: auth } : {} });

describe("/api/cron", () => {
  beforeEach(() => {
    runJobs.mockClear();
    vi.stubEnv("CRON_SECRET", "s3cret");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("runs the jobs with the right bearer token", async () => {
    const res = await GET(req("Bearer s3cret"));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toMatchObject({ ranAt: "2026-11-13T13:00:00.000Z" });
    expect(runJobs).toHaveBeenCalledOnce();
  });

  it("accepts POST too (the admin button and manual curl)", async () => {
    expect((await POST(req("Bearer s3cret"))).status).toBe(200);
  });

  it("rejects a missing or wrong token without running anything", async () => {
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req("Bearer nope"))).status).toBe(401);
    expect(runJobs).not.toHaveBeenCalled();
  });

  it("refuses to run at all when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const res = await GET(req("Bearer "));
    expect(res.status).toBe(500);
    expect(runJobs).not.toHaveBeenCalled();
  });
});
