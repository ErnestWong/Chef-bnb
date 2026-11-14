import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

export type Db = PrismaClient;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Non-local connections must use TLS: add sslmode=require when the URL says
 * nothing (Neon's own URLs already do) and refuse one that disables it.
 */
export function hardenConnectionString(connectionString: string): string {
  const url = new URL(connectionString);
  if (LOCAL_HOSTS.has(url.hostname)) return connectionString;
  const mode = url.searchParams.get("sslmode");
  if (mode === "disable" || mode === "allow" || mode === "prefer") {
    throw new Error(`Refusing a non-local database connection with sslmode=${mode}; use require or stricter.`);
  }
  if (!mode) url.searchParams.set("sslmode", "require");
  return url.toString();
}

/**
 * Build a Prisma client for the given connection string (pooled DATABASE_URL in
 * the app; TEST_DATABASE_URL in integration tests). Uses node-postgres, which
 * works with Neon and with any plain Postgres.
 */
export function createPrismaClient(
  connectionString: string | undefined = process.env.DATABASE_URL,
): PrismaClient {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set (see .env.example)");
  }
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: hardenConnectionString(connectionString),
      // Serverless-friendly pool: few connections per instance, nothing held
      // open for long, and no statement may run away.
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      statement_timeout: 15_000,
    }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { __chefbnbPrisma?: PrismaClient };

/**
 * Shared app client, created on first use so importing this module never needs
 * DATABASE_URL at build time. Cached on globalThis to survive dev hot reloads.
 */
export function getDb(): PrismaClient {
  if (!globalForPrisma.__chefbnbPrisma) {
    globalForPrisma.__chefbnbPrisma = createPrismaClient();
  }
  return globalForPrisma.__chefbnbPrisma;
}
