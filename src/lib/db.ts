import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

export type Db = PrismaClient;

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
    adapter: new PrismaPg({ connectionString }),
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
