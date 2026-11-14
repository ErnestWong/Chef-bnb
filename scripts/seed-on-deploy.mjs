// Runs during `vercel-build`, after migrations. Loads the demo seed into the
// deployment's database when SEED_ON_DEPLOY=yes is set for that environment.
// Never runs in production: the seed wipes every app table first.
import { spawnSync } from "node:child_process";

const wanted = process.env.SEED_ON_DEPLOY === "yes";
const production = process.env.VERCEL_ENV === "production";

if (!wanted) {
  console.log("seed-on-deploy: SEED_ON_DEPLOY is not 'yes'; skipping.");
} else if (production) {
  console.log("seed-on-deploy: refusing to seed a production deployment.");
} else {
  console.log(`seed-on-deploy: seeding the ${process.env.VERCEL_ENV ?? "local"} database…`);
  const r = spawnSync("pnpm", ["db:seed"], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
