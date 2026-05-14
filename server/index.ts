// Hono on Bun. Two jobs:
//   1. Mount /api/auth/* → Better Auth handler
//   2. Mount /api/rpc/* → oRPC RPCHandler with createContext
//
// In production it also serves the built SPA from /dist as the catch-all,
// so a single `bun run start` boots the whole thing. In dev, Vite (on :3000)
// proxies /api/* to this server (on :3001).

import { RPCHandler } from "@orpc/server/fetch";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { auth } from "~/server/auth";
import { createContext } from "~/server/orpc";
import { appRouter } from "~/server/router";

const PORT = Number(process.env.PORT ?? 3001);
const IS_PROD = process.env.NODE_ENV === "production";

const rpc = new RPCHandler(appRouter);
const app = new Hono();

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

// In prod, serve the built SPA. In dev, Vite handles this on its own port.
if (IS_PROD) {
  app.get("*", async (c) => {
    const url = new URL(c.req.url);
    const filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = Bun.file(`./dist${filePath}`);
    if (await file.exists()) return new Response(file);
    // SPA fallback for client-side routes
    return new Response(Bun.file("./dist/index.html"));
  });
}

// biome-ignore lint/suspicious/noConsoleLog: server startup banner
console.log(`[server] listening on http://localhost:${PORT} (${IS_PROD ? "prod" : "dev"})`);

export default {
  port: PORT,
  fetch: app.fetch,
};
