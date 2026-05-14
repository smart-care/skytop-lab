// Client-side oRPC + TanStack Query helpers.
// Lives in the browser bundle; do NOT import server code from here.

import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createRouterUtils } from "@orpc/react-query";
import type { RouterClient } from "@orpc/server";
import type { AppRouter } from "./router";

const link = new RPCLink({
  url: () => `${window.location.origin}/api/rpc`,
  // Send same-origin cookies (Better Auth session) on every RPC call.
  fetch: (req, init) => fetch(req, { ...init, credentials: "same-origin" }),
});

export const orpc = createORPCClient<RouterClient<AppRouter>>(link);
export const rpc = createRouterUtils(orpc);
