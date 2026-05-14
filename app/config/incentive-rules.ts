// Typed port of the RATES / TIERS / ACCELERATOR config from the Apps Script prototype.
// Source of truth lives here for v1; eventual follow-up is to move into a DB-backed admin UI.

export type Org = "EHS" | "THC";
export type ActionStatus = "Pending" | "Approved" | "Denied" | "Disputed";

export type ActionTypeName =
  | "Courtesy Report"
  | "Lead, Registered, Qualified"
  | "4+ Year Tech Visit Scheduled"
  | "Routine Visits Scheduled"
  | "Warranty Scheduled";

export const ACTION_TYPES: readonly ActionTypeName[] = [
  "Courtesy Report",
  "Lead, Registered, Qualified",
  "4+ Year Tech Visit Scheduled",
  "Routine Visits Scheduled",
  "Warranty Scheduled",
] as const;

export type TierName = "COURTESY" | "EHS_LRQ" | "THC_LRQ" | "ROUTINE" | "WARRANTY";

type Tier = ReadonlyArray<{ minDays: number; pct: number }>;

export const TIERS: Record<TierName, Tier> = {
  COURTESY: [
    { minDays: 0, pct: 1.0 },
    { minDays: 6, pct: 0.0 },
  ],
  EHS_LRQ: [
    { minDays: 0, pct: 1.0 },
    { minDays: 11, pct: 0.75 },
    { minDays: 13, pct: 0.5 },
    { minDays: 21, pct: 0.0 },
  ],
  THC_LRQ: [
    { minDays: 0, pct: 1.0 },
    { minDays: 8, pct: 0.75 },
    { minDays: 13, pct: 0.5 },
    { minDays: 21, pct: 0.0 },
  ],
  ROUTINE: [
    { minDays: 0, pct: 1.0 },
    { minDays: 15, pct: 0.75 },
    { minDays: 21, pct: 0.0 },
  ],
  WARRANTY: [
    { minDays: 0, pct: 1.0 },
    { minDays: 21, pct: 0.0 },
  ],
};

type RateConfig = {
  base: number;
  tier: TierName;
  accel?: { threshold: number; replacementRate: number };
};

export const RATES: Record<Org, Record<ActionTypeName, RateConfig>> = {
  EHS: {
    "Courtesy Report": { base: 5, tier: "COURTESY" },
    "Lead, Registered, Qualified": { base: 50, tier: "EHS_LRQ" },
    "4+ Year Tech Visit Scheduled": { base: 20, tier: "EHS_LRQ" },
    "Routine Visits Scheduled": { base: 10, tier: "ROUTINE" },
    "Warranty Scheduled": { base: 20, tier: "WARRANTY" },
  },
  THC: {
    "Courtesy Report": { base: 5, tier: "COURTESY" },
    "Lead, Registered, Qualified": {
      base: 100,
      tier: "THC_LRQ",
      accel: { threshold: 3, replacementRate: 150 },
    },
    "4+ Year Tech Visit Scheduled": {
      base: 20,
      tier: "THC_LRQ",
      accel: { threshold: 10, replacementRate: 50 },
    },
    "Routine Visits Scheduled": { base: 10, tier: "ROUTINE" },
    "Warranty Scheduled": { base: 20, tier: "WARRANTY" },
  },
};

export function tierPercentage(tier: TierName, days: number): number {
  const rows = TIERS[tier];
  let pct = 0;
  for (const row of rows) {
    if (days >= row.minDays) pct = row.pct;
    else break;
  }
  return pct;
}

export function calculateCommission(
  org: Org,
  actionType: ActionTypeName,
  days: number,
): { base: number; pct: number; commission: number } {
  const cfg = RATES[org]?.[actionType];
  if (!cfg) return { base: 0, pct: 0, commission: 0 };
  const pct = tierPercentage(cfg.tier, days);
  return { base: cfg.base, pct, commission: cfg.base * pct };
}

export function acceleratorFor(org: Org, actionType: ActionTypeName) {
  return RATES[org]?.[actionType]?.accel;
}
