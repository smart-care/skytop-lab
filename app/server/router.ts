import { bulkApprove, listActions, submitAction, updateStatus } from "./routes/actions";
import { getDashboard } from "./routes/dashboard";

// oRPC v1 routers are plain nested objects of procedures.
// Top-level shape is the public API surface; client types are inferred from it.
export const appRouter = {
  actions: {
    submit: submitAction,
    list: listActions,
    updateStatus,
    bulkApprove,
  },
  dashboard: {
    get: getDashboard,
  },
};

export type AppRouter = typeof appRouter;
