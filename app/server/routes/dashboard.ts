import { and, eq, gte, lte } from "drizzle-orm";
import { monthRange, todayStr } from "~/lib/utils";
import { db } from "~/server/db";
import { authed } from "~/server/orpc";
import { action } from "../../../drizzle/schema";

export const getDashboard = authed.handler(async ({ context }) => {
  const user = context.user;
  const monthStr = todayStr().slice(0, 7);
  const range = monthRange(monthStr);
  if (!range) return { period: monthStr, staffTotals: [], byAction: {}, pendingCount: 0 };

  const wheres = [gte(action.dateLogged, range.start), lte(action.dateLogged, range.end)];
  if (user.role === "staff") wheres.push(eq(action.staff, user.name));

  const rows = await db
    .select()
    .from(action)
    .where(and(...wheres));

  const staffTotals = new Map<
    string,
    { staff: string; org: string; actions: number; paid: number; pending: number; total: number }
  >();
  const byAction = new Map<string, { count: number; total: number }>();
  let pendingCount = 0;

  for (const row of rows) {
    if (row.status === "Denied") continue;
    const key = `${row.staff}|${row.org}`;
    const cur = staffTotals.get(key) ?? {
      staff: row.staff,
      org: row.org,
      actions: 0,
      paid: 0,
      pending: 0,
      total: 0,
    };
    cur.actions += 1;
    const comm = Number(row.commission) || 0;
    if (row.status === "Approved") cur.paid += comm;
    else {
      cur.pending += comm;
      pendingCount += 1;
    }
    cur.total += comm;
    staffTotals.set(key, cur);

    const a = byAction.get(row.actionType) ?? { count: 0, total: 0 };
    a.count += 1;
    a.total += comm;
    byAction.set(row.actionType, a);
  }

  return {
    period: monthStr,
    staffTotals: Array.from(staffTotals.values()),
    byAction: Object.fromEntries(byAction),
    pendingCount,
  };
});
