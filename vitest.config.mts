import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";

// TEST_DATABASE_URL from .env.local switches the Postgres-backed tests on locally.
loadEnv({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": fileURLToPath(new URL("./src/test/server-only.ts", import.meta.url)) },
  },
  test: {
    environment: "node",
    // Two projects: pure unit tests run in parallel; the Postgres-backed files share one
    // database and the jobs sweep scans all of it, so they run one file at a time.
    projects: [
      { extends: true, test: { name: "unit", include: ["src/**/*.test.ts", "src/**/*.test.tsx"], exclude: ["**/*.db.test.ts", "**/node_modules/**"] } },
      { extends: true, test: { name: "db", include: ["src/**/*.db.test.ts"], fileParallelism: false } },
    ],
  },
});
