// Vercel serverless function entry point. Catches all /api/* routes and hands
// them to the shared Hono app. vercel.json rewrites SPA routes to index.html
// so this function never sees non-API traffic.

import { handle } from "hono/vercel";
import { app } from "../server/app";

export const config = { runtime: "nodejs" };

export default handle(app);
