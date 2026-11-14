#!/usr/bin/env node
/**
 * Local Postgres for development and the db tests, with no system install:
 * `embedded-postgres` downloads real Postgres binaries into node_modules and
 * runs them against ./.local/pg (gitignored, persists between runs).
 *
 *   pnpm db:local        # start; leave it running in a terminal, Ctrl-C to stop
 *
 * Creates two databases: chef_bnb_dev (DATABASE_URL / DIRECT_URL) and
 * chef_bnb_test (TEST_DATABASE_URL). See .env.example for the URLs.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import EmbeddedPostgres from "embedded-postgres";

const PORT = Number(process.env.LOCAL_PG_PORT ?? 54329);
const dataDir = fileURLToPath(new URL("../.local/pg", import.meta.url));
const fresh = !existsSync(dataDir);

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "postgres",
  port: PORT,
  persistent: true,
  initdbFlags: ["--encoding=UTF8"],
});

if (fresh) await pg.initialise();
await pg.start();
for (const name of ["chef_bnb_dev", "chef_bnb_test"]) {
  try {
    await pg.createDatabase(name);
  } catch (err) {
    if (!/already exists/i.test(String(err))) throw err;
  }
}
console.log(`Postgres ready on localhost:${PORT} (data in .local/pg)`);
console.log(`  DATABASE_URL=postgresql://postgres:postgres@localhost:${PORT}/chef_bnb_dev`);
console.log(`  TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:${PORT}/chef_bnb_test`);
console.log("Ctrl-C to stop.");

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
