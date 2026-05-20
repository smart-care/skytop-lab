// Vercel serverless function entry point. Optional catch-all ([[...all]])
// matches /api and every /api/x/y/z under it — required catch-all ([...all])
// only matched single-segment paths in practice. Hands every request to the
// shared Hono app; vercel.json keeps non-/api traffic on the SPA.

import { handle } from "hono/vercel";
import { app } from "../server/app";

export const config = { runtime: "nodejs" };

export default handle(app);
