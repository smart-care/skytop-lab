import { ORPCError } from "@orpc/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import {
  ACTION_TYPES,
  type Org,
  acceleratorFor,
  calculateCommission,
} from "~/config/incentive-rules";
import { diffDays, monthRange, monthStrOf, todayStr } from "~/lib/utils";
import { db } from "~/server/db";
import { admin, authed } from "~/server/orpc";
import { action } from "../../../drizzle/schema";

const actionTypeSchema = z.enum(ACTION_TYPES as readonly [string, ...string[]]);
const orgSchema = z.enum(["EHS", "THC"]);
const statusSchema = z.enum(["Pending", "Approved", "Denied", "Disputed"]);

const submitInput = z.object({
  dateLogged: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  org: orgSchema.optional(),
  staff: z.string().optional(),
  mrn: z.string().optional(),
  actionType: actionTypeSchema,
  location: z.string().optional(),
  outreach: z.string().optional(),
  scheduledOn: z.string().optional(),
  apptDate: z.string().optional(),
  reportSent: z.string().optional(),
  proofLink: z.string().url().optional().or(z.literal("")),
});

async function applyAccelerator(args: {
  org: Org;
  staff: string;
  actionType: string;
  rawCommission: number;
  monthStr: string;
}): Promise<number> {
  const accel = acceleratorFor(args.org, args.actionType as never);
  if (!accel) return args.rawCommission;
  const range = monthRange(args.monthStr);
  if (!range) return args.rawCommission;
  const rows = await db
    .select({ status: action.status })
    .from(action)
    .where(
      and(
        eq(action.org, args.org),
        eq(action.staff, args.staff),
        eq(action.actionType, args.actionType),
        gte(action.dateLogged, range.start),
        lte(action.dateLogged, range.end),
      ),
    );
  const counted = rows.filter((r) => r.status !== "Denied").length;
  return counted >= accel.threshold ? accel.replacementRate : args.rawCommission;
}

export const submitAction = authed.input(submitInput).handler(async ({ input, context }) => {
  const user = context.user;
  const isStaff = user.role === "staff";

  const org = (isStaff ? user.org : input.org) as Org | null;
  const staff = isStaff ? user.name : (input.staff ?? "");
  if (!org) throw new ORPCError("BAD_REQUEST", { message: "Org is required" });
  if (!staff) throw new ORPCError("BAD_REQUEST", { message: "Staff is required" });

  const dateLogged = input.dateLogged ?? todayStr();
  const days =
    input.actionType === "Courtesy Report"
      ? diffDays(input.apptDate ?? null, input.reportSent ?? null)
      : diffDays(input.outreach ?? null, input.apptDate ?? null);

  const { pct, commission: raw } = calculateCommission(org, input.actionType as never, days);
  const finalCommission = await applyAccelerator({
    org,
    staff,
    actionType: input.actionType,
    rawCommission: raw,
    monthStr: monthStrOf(dateLogged),
  });

  const [row] = await db
    .insert(action)
    .values({
      dateLogged,
      org,
      staff,
      mrn: input.mrn ?? null,
      actionType: input.actionType,
      location: input.location ?? null,
      outreach: input.outreach ?? null,
      scheduledOn: input.scheduledOn ?? null,
      apptDate: input.apptDate ?? null,
      reportSent: input.reportSent ?? null,
      proofLink: input.proofLink || null,
      daysCalc: days,
      pctEarned: pct,
      commission: finalCommission,
      status: "Pending",
    })
    .returning({ id: action.id });

  return { id: row?.id, days, pct, commission: finalCommission };
});

const listInput = z
  .object({
    org: orgSchema.optional(),
    staff: z.string().optional(),
    status: statusSchema.optional(),
    periodStart: z.string().optional(),
    periodEnd: z.string().optional(),
  })
  .optional();

export const listActions = authed.input(listInput).handler(async ({ input, context }) => {
  const user = context.user;
  const filters = input ?? {};
  const wheres = [];
  if (user.role === "staff") {
    if (!user.org) return { rows: [] };
    wheres.push(eq(action.org, user.org));
    wheres.push(eq(action.staff, user.name));
  } else {
    if (filters.org) wheres.push(eq(action.org, filters.org));
    if (filters.staff) wheres.push(eq(action.staff, filters.staff));
  }
  if (filters.status) wheres.push(eq(action.status, filters.status));
  if (filters.periodStart) wheres.push(gte(action.dateLogged, filters.periodStart));
  if (filters.periodEnd) wheres.push(lte(action.dateLogged, filters.periodEnd));

  const rows = await db
    .select()
    .from(action)
    .where(wheres.length ? and(...wheres) : undefined)
    .orderBy(desc(action.dateLogged), desc(action.createdAt));
  return { rows };
});

export const updateStatus = admin
  .input(
    z.object({
      id: z.string().uuid(),
      status: statusSchema,
      note: z.string().optional(),
    }),
  )
  .handler(async ({ input }) => {
    const result = await db
      .update(action)
      .set({ status: input.status, adminNote: input.note ?? null })
      .where(eq(action.id, input.id))
      .returning({ id: action.id });
    if (result.length === 0) throw new ORPCError("NOT_FOUND", { message: "Action not found" });
    return { ok: true as const };
  });

export const bulkApprove = admin
  .input(z.object({ ids: z.array(z.string().uuid()).min(1) }))
  .handler(async ({ input }) => {
    let count = 0;
    for (const id of input.ids) {
      const result = await db
        .update(action)
        .set({ status: "Approved" })
        .where(eq(action.id, id))
        .returning({ id: action.id });
      count += result.length;
    }
    return { count };
  });
