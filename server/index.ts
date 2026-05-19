// Bun entry point. In dev: Vite (on :3000) proxies /api/* here. In local prod
// (`bun run start`): this also serves the built SPA from /dist as a catch-all.
//
// On Vercel, this file isn't used — api/[...all].ts is the entry point and
// Vercel itself serves the static SPA.

import { app } from "./app";

const PORT = Number(process.env.PORT ?? 3001);
const IS_PROD = process.env.NODE_ENV === "production";

if (IS_PROD) {
  app.get("*", async (c) => {
    const url = new URL(c.req.url);
    const filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = Bun.file(`./dist${filePath}`);
    if (await file.exists()) return new Response(file);
    return new Response(Bun.file("./dist/index.html"));
  });
}

// biome-ignore lint/suspicious/noConsoleLog: server startup banner
console.log(`[server] listening on http://localhost:${PORT} (${IS_PROD ? "prod" : "dev"})`);

export default {
  port: PORT,
  fetch: app.fetch,
};
