// Seed the six prototype users by direct insert into the `user` table.
// Run with: bun run db:seed
//
// We bypass Better Auth's signUp here because email+password auth is disabled.
// Magic-link sign-in works against any user row that exists with a matching email.

import { eq } from "drizzle-orm";
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

async function main() {
  console.log(`Seeding ${SEEDS.length} users…`);
  for (const seed of SEEDS) {
    const existing = await db.query.user.findFirst({
      where: eq(userTable.email, seed.email),
    });
    if (existing) {
      console.log(`  ✓ ${seed.email} already exists, skipping`);
      continue;
    }
    await db.insert(userTable).values({
      id: crypto.randomUUID(),
      email: seed.email,
      name: seed.name,
      role: seed.role,
      org: seed.org,
      emailVerified: true,
    });
    console.log(`  + ${seed.email} (${seed.role}${seed.org ? `/${seed.org}` : ""})`);
  }
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
