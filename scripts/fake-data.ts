// Insert ~80 realistic fake action rows so the dashboard / tables aren't empty.
// Run with:
//   bun run scripts/fake-data.ts          # insert (skips if fakes already exist)
//   bun run scripts/fake-data.ts --clear  # remove all fake rows
//
// Fakes are tagged with proofLink="fake://seed" so they're identifiable and
// deletable without touching real data.

import { eq } from "drizzle-orm";
import { type ActionTypeName, type Org, calculateCommission } from "../app/config/incentive-rules";
import { db } from "../app/server/db";
import { action } from "../drizzle/schema";

const FAKE_MARKER = "fake://seed";
const TOTAL_ROWS = 80;
const PEOPLE: { name: string; org: Org }[] = [
  { name: "Addison", org: "EHS" },
  { name: "Chelsea", org: "EHS" },
  { name: "Krystal", org: "THC" },
  { name: "Cosette", org: "THC" },
];
const LOCATIONS = ["Main Clinic", "North Branch", "South Branch", "Mobile"];

// Action-type weights so LRQ is most common (it's the headline action).
const ACTION_WEIGHTS: Array<[ActionTypeName, number]> = [
  ["Lead, Registered, Qualified", 5],
  ["Routine Visits Scheduled", 3],
  ["Warranty Scheduled", 2],
  ["4+ Year Tech Visit Scheduled", 2],
  ["Courtesy Report", 1],
];

const STATUS_WEIGHTS: Array<["Pending" | "Approved" | "Denied", number]> = [
  ["Approved", 65],
  ["Pending", 25],
  ["Denied", 10],
];

function weighted<T>(items: Array<[T, number]>): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [item, w] of items) {
    r -= w;
    if (r <= 0) return item;
  }
  // biome-ignore lint/style/noNonNullAssertion: items is always non-empty by construction
  return items[0]![0];
}

function pick<T>(arr: readonly T[]): T {
  // biome-ignore lint/style/noNonNullAssertion: arr is always non-empty by construction
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function daysAgo(d: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - d);
  return date;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function clear() {
  const result = await db.delete(action).where(eq(action.proofLink, FAKE_MARKER));
  console.log(`Cleared ${result.length ?? "(unknown)"} fake rows.`);
}

async function insert() {
  const existing = await db.query.action.findFirst({
    where: eq(action.proofLink, FAKE_MARKER),
  });
  if (existing) {
    console.log(
      "Fake rows already present. Use `bun run scripts/fake-data.ts --clear` to remove them first.",
    );
    return;
  }

  console.log(`Inserting ${TOTAL_ROWS} fake rows…`);
  const rows = [];

  for (let i = 0; i < TOTAL_ROWS; i++) {
    const person = pick(PEOPLE);
    const actionType = weighted(ACTION_WEIGHTS);
    const status = weighted(STATUS_WEIGHTS);

    // Scatter rows across the last 90 days.
    const dateLogged = ymd(daysAgo(Math.floor(Math.random() * 90)));

    // Outreach is 0–25 days before the appointment, hitting all the tier breakpoints.
    const gap = Math.floor(Math.random() * 26);
    const apptDate = daysAgo(Math.floor(Math.random() * 90));
    const outreach = new Date(apptDate);
    outreach.setDate(outreach.getDate() - gap);

    const isCourtesy = actionType === "Courtesy Report";
    const days = isCourtesy ? Math.floor(Math.random() * 8) : gap;
    const { pct, commission } = calculateCommission(person.org, actionType, days);

    rows.push({
      dateLogged,
      org: person.org,
      staff: person.name,
      mrn: `MRN-${Math.floor(Math.random() * 90000) + 10000}`,
      actionType,
      location: pick(LOCATIONS),
      outreach: isCourtesy ? null : ymd(outreach),
      apptDate: ymd(apptDate),
      reportSent: isCourtesy ? ymd(new Date(apptDate.getTime() + days * 86_400_000)) : null,
      scheduledOn: ymd(daysAgo(gap + Math.floor(Math.random() * 5))),
      proofLink: FAKE_MARKER,
      daysCalc: days,
      pctEarned: pct,
      commission,
      status,
      adminNote:
        status === "Denied" ? "Out of policy window." : status === "Approved" ? null : null,
    });
  }

  await db.insert(action).values(rows);
  console.log(`Done. ${rows.length} fake rows inserted.`);

  const approved = rows.filter((r) => r.status === "Approved").length;
  const pending = rows.filter((r) => r.status === "Pending").length;
  const denied = rows.filter((r) => r.status === "Denied").length;
  const totalCommission = rows.reduce((s, r) => s + r.commission, 0);
  console.log(
    `  Approved: ${approved}  Pending: ${pending}  Denied: ${denied}  Total commission: $${totalCommission.toFixed(2)}`,
  );
}

const mode = process.argv.includes("--clear") ? "clear" : "insert";
if (mode === "clear") {
  await clear();
} else {
  await insert();
}

process.exit(0);
