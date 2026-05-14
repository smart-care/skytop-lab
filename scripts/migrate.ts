// Apply pending Drizzle migrations from drizzle/migrations/ against the DB.
// Run with: bun run db:migrate
//
// We invoke the migrator directly rather than `drizzle-kit migrate` because
// the latter doesn't pick up `.env` cleanly; bun auto-loads .env when it
// runs a script file like this one.

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// `||` (not `??`) so that an empty-string MIGRATION_DATABASE_URL (the .env.example default)
// falls through to DATABASE_URL instead of being treated as "set".
const url = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL (or MIGRATION_DATABASE_URL) is not set.");
  process.exit(1);
}

const target = new URL(url);
console.log(`Migrating ${target.host}${target.pathname}…`);

const client = postgres(url, { max: 1 });
const db = drizzle(client);

await migrate(db, { migrationsFolder: "./drizzle/migrations" });
await client.end();

console.log("Done.");
