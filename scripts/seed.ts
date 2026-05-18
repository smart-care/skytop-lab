// Seed the six prototype users for local development.
// Run with: bun run db:seed
// Run with: bun run db:seed --reset    (wipes the six seed users first, then recreates)
//
// Uses Better Auth's signUpEmail so each user gets a hashed credential record,
// then patches role/org on the user row. The session / account FK cascades on
// delete, so --reset cleanly removes the credential too.

import { eq, inArray } from "drizzle-orm";
import { auth } from "../app/server/auth";
import { db } from "../app/server/db";
import { user as userTable } from "../drizzle/schema";

type Seed = {
  email: string;
  name: string;
  role: "owner" | "admin" | "staff";
  org: "EHS" | "THC" | null;
};

const SEEDS: Seed[] = [
  { email: "skylar@skytop.example", name: "Skylar", role: "owner", org: null },
  { email: "maren@skytop.example", name: "Maren", role: "admin", org: null },
  { email: "addison@skytop.example", name: "Addison", role: "staff", org: "EHS" },
  { email: "chelsea@skytop.example", name: "Chelsea", role: "staff", org: "EHS" },
  { email: "krystal@skytop.example", name: "Krystal", role: "staff", org: "THC" },
  { email: "cosette@skytop.example", name: "Cosette", role: "staff", org: "THC" },
];

const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "skytop-dev-password";
const RESET = process.argv.includes("--reset");

async function main() {
  if (SEED_PASSWORD === "skytop-dev-password") {
    console.log("Using default dev password 'skytop-dev-password'. Override with SEED_PASSWORD.");
  }

  if (RESET) {
    const emails = SEEDS.map((s) => s.email);
    const deleted = await db
      .delete(userTable)
      .where(inArray(userTable.email, emails))
      .returning({ email: userTable.email });
    console.log(`Reset: deleted ${deleted.length} existing seed user(s).`);
  }

  console.log(`Seeding ${SEEDS.length} users…`);
  for (const seed of SEEDS) {
    const existing = await db.query.user.findFirst({
      where: (u, { eq }) => eq(u.email, seed.email),
    });
    if (existing) {
      console.log(`  ✓ ${seed.email} already exists, skipping (use --reset to recreate)`);
      continue;
    }
    await auth.api.signUpEmail({
      body: { email: seed.email, password: SEED_PASSWORD, name: seed.name },
    });
    await db
      .update(userTable)
      .set({ role: seed.role, org: seed.org, emailVerified: true })
      .where(eq(userTable.email, seed.email));
    console.log(`  + ${seed.email} (${seed.role}${seed.org ? `/${seed.org}` : ""})`);
  }
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
