import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { Resend } from "resend";
import { env } from "~/lib/env";
import * as schema from "../../drizzle/schema";
import { db } from "./db";

// Lazy-init: no Resend key configured means we never construct the client.
// Magic links fall back to console logging — see sendMagicLink below.
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

// In preview/dev, only send magic links to allowlisted addresses so a PR preview
// can't be used to mail anybody who happens to type their address in.
const PREVIEW_EMAIL_ALLOWLIST = [/@builtbyhq\.com$/i, /@skytop\.example$/i];

function emailAllowedForEnv(email: string): boolean {
  if (env.APP_ENV === "production") return true;
  return PREVIEW_EMAIL_ALLOWLIST.some((re) => re.test(email));
}

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: { enabled: false },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        if (!emailAllowedForEnv(email)) {
          console.warn(`[auth] Refusing magic link to ${email} in ${env.APP_ENV} env`);
          return;
        }
        if (!resend) {
          // No mailer configured — log the URL so the dev can click it from their terminal.
          // Production env validation should be set up before any real users exist; if you see
          // this in prod logs, something is misconfigured.
          console.warn(
            `[auth] No RESEND_API_KEY set. Magic link for ${email}:\n  ${url}\n  (expires in 15 min)`,
          );
          return;
        }
        await resend.emails.send({
          from: env.MAGIC_LINK_FROM,
          to: email,
          subject: "Your Skytop Lab login link",
          text: `Click to sign in: ${url}\n\nThis link expires in 15 minutes.`,
        });
      },
      expiresIn: 60 * 15,
    }),
  ],
});

export type Auth = typeof auth;
export type AuthUser = Awaited<ReturnType<Auth["api"]["getSession"]>>;
