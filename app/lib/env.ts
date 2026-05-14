import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    MIGRATION_DATABASE_URL: z.string().url().optional(),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),
    // Optional. If unset, magic-link URLs are logged to the server console
    // instead of mailed — useful for first-boot before a real mailer is wired up.
    RESEND_API_KEY: z.string().optional(),
    MAGIC_LINK_FROM: z.string().default("Skytop Lab <noreply@localhost>"),
    APP_ENV: z.enum(["development", "preview", "production"]),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

// Startup assertion: fail loud if the DB URL host doesn't match the declared environment.
// Catches "prod app accidentally pointed at dev DB" and vice versa.
const dbHost = new URL(env.DATABASE_URL).host;
const isLocalDb = dbHost.startsWith("localhost") || dbHost.startsWith("127.");
if (env.APP_ENV === "production" && isLocalDb) {
  throw new Error("APP_ENV=production but DATABASE_URL points at localhost. Refusing to start.");
}
if (env.APP_ENV === "development" && dbHost.includes("neon.tech") && !dbHost.includes("dev")) {
  // Soft signal: dev environments should be on a Neon dev branch (host typically contains "dev" or branch slug).
  // Not a hard error because Neon hostnames vary; loud warning instead.
  console.warn(
    `[env] APP_ENV=development but DATABASE_URL host=${dbHost} doesn't look like a dev branch.`,
  );
}
