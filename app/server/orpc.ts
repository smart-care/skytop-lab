import { os, ORPCError } from "@orpc/server";
import { eq } from "drizzle-orm";
import { user as userTable } from "../../drizzle/schema";
import { auth } from "./auth";
import { db } from "./db";

export type Context = {
  request: Request;
  user: {
    id: string;
    email: string;
    name: string;
    role: "owner" | "admin" | "staff";
    org: "EHS" | "THC" | null;
  } | null;
};

export async function createContext(request: Request): Promise<Context> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return { request, user: null };
  const profile = await db.query.user.findFirst({
    where: eq(userTable.id, session.user.id),
  });
  if (!profile) return { request, user: null };
  return {
    request,
    user: {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      org: profile.org,
    },
  };
}

const base = os.$context<Context>();

const requireAuthed = base.middleware(async ({ context, next }) => {
  if (!context.user) {
    throw new ORPCError("UNAUTHORIZED", { message: "Sign in required" });
  }
  return next({ context: { ...context, user: context.user } });
});

const requireAdmin = base.middleware(async ({ context, next }) => {
  if (!context.user) {
    throw new ORPCError("UNAUTHORIZED", { message: "Sign in required" });
  }
  if (context.user.role === "staff") {
    throw new ORPCError("FORBIDDEN", { message: "Admin only" });
  }
  return next({ context: { ...context, user: context.user } });
});

// Every authed route uses `authed` (or `admin`). Public routes use `pub` and must
// be explicitly named in the router definition — easy to grep for during review.
export const pub = base;
export const authed = base.use(requireAuthed);
export const admin = base.use(requireAdmin);
