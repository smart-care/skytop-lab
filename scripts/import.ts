// Import historical action data from the spreadsheet exports.
//
// Usage:
//   bun run scripts/import.ts                 # dry-run, no DB writes; prints summary
//   bun run scripts/import.ts --commit        # actually insert (idempotent via deterministic IDs)
//   bun run scripts/import.ts --clear         # delete every row previously imported by this script
//
// Notes on design:
// - The THC CSV is an action list (granular events). The EHS CSV is a pivot summary
//   and CANNOT be imported at the action level — we warn and skip it.
// - Each imported row's primary key is a SHA-256-derived UUID hashed from
//   (sourceFile, rowIndex). Same source row → same id → re-running is a no-op via
//   `.onConflictDoNothing()`. To re-import after changing the source, run --clear first.
// - We trust the `Commission $` column verbatim. The historical record reflects what
//   was actually paid; we do NOT recompute under today's rules.
// - Action types from the source are preserved as-is, including retired types.
//   Those have no current commission rule in app/config/incentive-rules.ts, so new
//   submissions can't use them — but historical rows display in tables and dashboards.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { inArray } from "drizzle-orm";
import { db } from "../app/server/db";
import { action } from "../drizzle/schema";

type ActionStatus = "Pending" | "Approved" | "Denied" | "Disputed";
type Org = "EHS" | "THC";

type Source = {
  path: string;
  org: Org;
  /** 0-indexed line where the header row lives (everything before is preamble). */
  headerLineIndex: number;
};

const NOTES_DIR = "/Users/paxtonbigler/Work/smartcare/notes";

const SOURCES: Source[] = [
  {
    path: `${NOTES_DIR}/The Hearing Clinic _ Front Office Incentive Structure - Front Office Action List.csv`,
    org: "THC",
    headerLineIndex: 15,
  },
];

const UNSUPPORTED_SOURCES: { path: string; reason: string }[] = [
  {
    path: `${NOTES_DIR}/Ebia Hearing & Sound  EHS _ Front Office Incentive Structure - Front Office Commission & Cost Summary.csv`,
    reason: "Pivot summary, not an action list. Need a per-action export to import.",
  },
];

// --- Parsers --------------------------------------------------------------

function parseDate(s: string | undefined): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!match) return null;
  const m = Number(match[1]);
  const d = Number(match[2]);
  let y = Number(match[3]);
  if (y < 100) y += 2000;
  // Reject implausible years (e.g. "0202" typo) and out-of-range months/days.
  if (y < 2000 || y > 2100) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseCurrency(s: string | undefined): number {
  if (!s) return 0;
  const cleaned = s.replace(/[$,\s]/g, "");
  if (!cleaned) return 0;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parsePercent(s: string | undefined): number {
  if (!s) return 0;
  const cleaned = s.replace(/[%\s]/g, "");
  if (!cleaned) return 0;
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return 0;
  return n > 1 ? n / 100 : n;
}

function parseInt0(s: string | undefined): number {
  if (!s) return 0;
  const n = Number.parseInt(s.trim(), 10);
  return Number.isFinite(n) ? n : 0;
}

function trimOrNull(s: string | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  return t === "" ? null : t;
}

function normalizeStatus(raw: string | undefined): {
  status: ActionStatus;
  spilledPercent?: number;
} {
  const cleaned = (raw ?? "").trim();
  if (!cleaned) return { status: "Pending" };
  if (/^maren$/i.test(cleaned)) return { status: "Approved" };
  const pctMatch = cleaned.match(/^([\d.]+)%$/);
  if (pctMatch) {
    return { status: "Approved", spilledPercent: parsePercent(pctMatch[0]) };
  }
  const lower = cleaned.toLowerCase();
  if (lower === "approved") return { status: "Approved" };
  if (lower === "denied") return { status: "Denied" };
  if (lower === "pending") return { status: "Pending" };
  if (lower === "disputed") return { status: "Disputed" };
  return { status: "Approved" };
}

function deterministicId(sourcePath: string, rowIndex: number): string {
  const hex = createHash("sha256").update(`${sourcePath}#${rowIndex}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// --- Row mapping ----------------------------------------------------------

type TargetRow = typeof action.$inferInsert;

type ImportResult = {
  source: Source;
  total: number;
  mapped: TargetRow[];
  skipped: { rowIndex: number; reason: string }[];
  byActionType: Map<string, number>;
  byStatus: Map<ActionStatus, number>;
  byStaff: Map<string, number>;
  byYear: Map<string, number>;
  totalCommission: number;
};

function processSource(source: Source): ImportResult {
  const raw = readFileSync(source.path, "utf8");
  const lines = raw.split(/\r?\n/);
  const csvBody = lines.slice(source.headerLineIndex).join("\n");
  const rows = parse(csvBody, {
    columns: true,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  const result: ImportResult = {
    source,
    total: rows.length,
    mapped: [],
    skipped: [],
    byActionType: new Map(),
    byStatus: new Map(),
    byStaff: new Map(),
    byYear: new Map(),
    totalCommission: 0,
  };

  rows.forEach((row, i) => {
    const rowIndex = source.headerLineIndex + 1 + i;
    const dateLogged = parseDate(row["Recorded Date"]);
    const staff = trimOrNull(row["Staff Name"]);
    const actionType = trimOrNull(row["Action Type"]);

    if (!dateLogged) {
      result.skipped.push({ rowIndex, reason: "missing/unparseable date" });
      return;
    }
    if (!staff) {
      result.skipped.push({ rowIndex, reason: "missing staff" });
      return;
    }
    if (!actionType) {
      result.skipped.push({ rowIndex, reason: "missing action type" });
      return;
    }

    const { status, spilledPercent } = normalizeStatus(row.Status);
    const pctEarned = spilledPercent ?? parsePercent(row["% Earned"]);
    const commission = parseCurrency(row["Commission $"]);
    const daysCalc =
      parseInt0(row["Scheduled Within Days"]) || parseInt0(row["Customer Response Days"]);

    const target: TargetRow = {
      id: deterministicId(source.path, rowIndex),
      dateLogged,
      org: source.org,
      staff,
      mrn: trimOrNull(row["Smartcare MRN"]),
      actionType,
      location: trimOrNull(row["Appointment Location"]),
      outreach: parseDate(row["Last Outreach"]),
      scheduledOn: parseDate(row["Scheduled On"]),
      apptDate: parseDate(row["Appt Date"]),
      reportSent: parseDate(row["Report Sent"]),
      proofLink: trimOrNull(row["Proof Link"]),
      daysCalc,
      pctEarned,
      commission,
      status,
      adminNote: trimOrNull(row["Commission Note"]),
      disputeNote: trimOrNull(row["Dispute Note"]),
    };

    result.mapped.push(target);
    bump(result.byActionType, actionType);
    bump(result.byStatus, status);
    bump(result.byStaff, staff);
    bump(result.byYear, dateLogged.slice(0, 4));
    result.totalCommission += commission;
  });

  return result;
}

function bump<K>(m: Map<K, number>, k: K) {
  m.set(k, (m.get(k) ?? 0) + 1);
}

// --- Reporting ------------------------------------------------------------

function reportResult(r: ImportResult) {
  console.log(`\n--- ${r.source.path.replace(`${NOTES_DIR}/`, "")} ---`);
  console.log(`  Total source rows: ${r.total}`);
  console.log(`  Importable:        ${r.mapped.length}`);
  console.log(`  Skipped:           ${r.skipped.length}`);
  if (r.skipped.length > 0) {
    const reasons = new Map<string, number>();
    for (const s of r.skipped) bump(reasons, s.reason);
    for (const [reason, count] of reasons) {
      console.log(`    - ${reason}: ${count}`);
    }
  }
  console.log(`  Total commission:  $${r.totalCommission.toFixed(2)}`);
  console.log("\n  By status:");
  for (const [k, v] of [...r.byStatus.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k.padEnd(10)} ${v}`);
  }
  console.log("\n  By year:");
  for (const [k, v] of [...r.byYear.entries()].sort()) {
    console.log(`    ${k}  ${v}`);
  }
  console.log("\n  By staff:");
  for (const [k, v] of [...r.byStaff.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k.padEnd(12)} ${v}`);
  }
  console.log("\n  By action type:");
  const sorted = [...r.byActionType.entries()].sort((a, b) => b[1] - a[1]);
  for (const [k, v] of sorted) {
    console.log(`    ${v.toString().padStart(5)}  ${k}`);
  }
}

async function commitAll(results: ImportResult[]) {
  let inserted = 0;
  for (const r of results) {
    if (r.mapped.length === 0) continue;
    console.log(`\nInserting ${r.mapped.length} rows from ${r.source.org}…`);
    const BATCH = 500;
    for (let i = 0; i < r.mapped.length; i += BATCH) {
      const slice = r.mapped.slice(i, i + BATCH);
      const result = await db
        .insert(action)
        .values(slice)
        .onConflictDoNothing({ target: action.id })
        .returning({ id: action.id });
      inserted += result.length;
    }
  }
  console.log(`\nInserted ${inserted} new rows total.`);
}

async function clearAll(results: ImportResult[]) {
  const ids = results.flatMap((r) => r.mapped.map((m) => m.id as string));
  if (ids.length === 0) {
    console.log("No imported IDs to clear.");
    return;
  }
  console.log(`Clearing up to ${ids.length} previously-imported rows…`);
  const BATCH = 500;
  let deleted = 0;
  for (let i = 0; i < ids.length; i += BATCH) {
    const slice = ids.slice(i, i + BATCH);
    const result = await db
      .delete(action)
      .where(inArray(action.id, slice))
      .returning({ id: action.id });
    deleted += result.length;
  }
  console.log(`Deleted ${deleted} rows.`);
}

// --- Main -----------------------------------------------------------------

const args = new Set(process.argv.slice(2));
const commit = args.has("--commit");
const clear = args.has("--clear");

console.log(
  commit ? "Mode: COMMIT (writing to DB)" : clear ? "Mode: CLEAR" : "Mode: dry-run (no DB writes)",
);

for (const u of UNSUPPORTED_SOURCES) {
  console.warn(`SKIPPING ${u.path.replace(`${NOTES_DIR}/`, "")}: ${u.reason}`);
}

const results = SOURCES.map(processSource);
for (const r of results) reportResult(r);

if (clear) {
  await clearAll(results);
} else if (commit) {
  await commitAll(results);
} else {
  console.log("\n(dry-run; nothing written. Re-run with --commit to actually insert.)");
}

process.exit(0);
