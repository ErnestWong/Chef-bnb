import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js reads .env.local on its own; the Prisma CLI does not, so load it here
// (first file wins, so a real environment variable still takes precedence).
loadEnv({ path: [".env.local", ".env"], quiet: true });

// Migrations use the direct (unpooled) Neon URL; the app uses DATABASE_URL (pooled)
// via @prisma/adapter-neon. `prisma generate` never connects, so it must work without
// either variable (CI, fresh clones); the placeholder makes that explicit, and any
// command that does connect fails with an obvious host name.
const url =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://unset:unset@direct-url-not-set.invalid:5432/unset";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: { url },
});
