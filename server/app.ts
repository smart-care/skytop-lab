// Hono app construction shared by both runtimes:
//   - Bun (local + `bun run start`): server/index.ts imports `app` and binds it to a port.
//   - Vercel (production): api/[...all].ts imports `app` and wraps it with hono/vercel's handle().
//
// The app only handles /api/*. Static SPA assets are served by the runtime — Bun reads from
// /dist in server/index.ts, Vercel serves them as static files via vercel.json rewrites.

import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { auth } from "~/server/auth";
import { createContext } from "~/server/orpc";
import { appRouter } from "~/server/router";

const rpc = new RPCHandler(appRouter);
export const app = new Hono();

app.use("*", logger());

app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.all("/api/rpc/*", async (c) => {
  const context = await createContext(c.req.raw);
  const { matched, response } = await rpc.handle(c.req.raw, {
    prefix: "/api/rpc",
    context,
  });
  if (matched && response) return response;
  return c.notFound();
});
