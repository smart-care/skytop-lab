import { describe, expect, test } from "vitest";
import { calculateCommission, tierPercentage } from "./incentive-rules";

// Parity-check against the prototype's calculation table.
// If these break, the math drifted from code.gs and we owe a migration note.

describe("tierPercentage", () => {
  test("EHS_LRQ tiers", () => {
    expect(tierPercentage("EHS_LRQ", 0)).toBe(1.0);
    expect(tierPercentage("EHS_LRQ", 10)).toBe(1.0);
    expect(tierPercentage("EHS_LRQ", 11)).toBe(0.75);
    expect(tierPercentage("EHS_LRQ", 12)).toBe(0.75);
    expect(tierPercentage("EHS_LRQ", 13)).toBe(0.5);
    expect(tierPercentage("EHS_LRQ", 20)).toBe(0.5);
    expect(tierPercentage("EHS_LRQ", 21)).toBe(0);
    expect(tierPercentage("EHS_LRQ", 999)).toBe(0);
  });

  test("THC_LRQ tiers", () => {
    expect(tierPercentage("THC_LRQ", 0)).toBe(1.0);
    expect(tierPercentage("THC_LRQ", 7)).toBe(1.0);
    expect(tierPercentage("THC_LRQ", 8)).toBe(0.75);
    expect(tierPercentage("THC_LRQ", 13)).toBe(0.5);
    expect(tierPercentage("THC_LRQ", 21)).toBe(0);
  });

  test("COURTESY tier expires at day 6", () => {
    expect(tierPercentage("COURTESY", 5)).toBe(1.0);
    expect(tierPercentage("COURTESY", 6)).toBe(0);
  });
});

describe("calculateCommission", () => {
  test("EHS LRQ base $50 at 100%", () => {
    expect(calculateCommission("EHS", "Lead, Registered, Qualified", 0)).toEqual({
      base: 50,
      pct: 1.0,
      commission: 50,
    });
  });

  test("THC LRQ base $100 decays to $50 at 13 days", () => {
    expect(calculateCommission("THC", "Lead, Registered, Qualified", 13)).toEqual({
      base: 100,
      pct: 0.5,
      commission: 50,
    });
  });

  test("Warranty has no partial tier", () => {
    expect(calculateCommission("EHS", "Warranty Scheduled", 20).commission).toBe(20);
    expect(calculateCommission("EHS", "Warranty Scheduled", 21).commission).toBe(0);
  });
});
