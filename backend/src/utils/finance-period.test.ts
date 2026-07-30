import { describe, expect, it } from "vitest";

import {
  clampToMonth,
  currentPeriod,
  isPeriodBefore,
  nextPeriod,
  periodEnd,
  periodOf,
  periodStart,
  trailingPeriods,
} from "./finance-period.js";

describe("finance-period utils", () => {
  it("periodOf() formats a date as YYYY-MM", () => {
    expect(periodOf(new Date(2026, 6, 15))).toBe("2026-07");
    expect(periodOf(new Date(2026, 0, 1))).toBe("2026-01");
  });

  it("currentPeriod() matches periodOf(new Date())", () => {
    expect(currentPeriod()).toBe(periodOf(new Date()));
  });

  it("nextPeriod() rolls over the year boundary", () => {
    expect(nextPeriod("2026-12")).toBe("2027-01");
    expect(nextPeriod("2026-07")).toBe("2026-08");
  });

  it("isPeriodBefore() compares period strings lexicographically", () => {
    expect(isPeriodBefore("2026-07", "2026-08")).toBe(true);
    expect(isPeriodBefore("2026-12", "2027-01")).toBe(true);
    expect(isPeriodBefore("2026-08", "2026-07")).toBe(false);
    expect(isPeriodBefore("2026-07", "2026-07")).toBe(false);
  });

  it("periodStart()/periodEnd() bound the calendar month", () => {
    expect(periodStart("2026-07").getDate()).toBe(1);
    expect(periodEnd("2026-07").getDate()).toBe(31);
    // February in a non-leap year
    expect(periodEnd("2026-02").getDate()).toBe(28);
  });

  it("clampToMonth() clamps dayOfMonth to the real last day of a short month", () => {
    expect(clampToMonth("2026-02", 31).getDate()).toBe(28);
    expect(clampToMonth("2024-02", 31).getDate()).toBe(29); // leap year
    expect(clampToMonth("2026-07", 31).getDate()).toBe(31);
    expect(clampToMonth("2026-07", 5).getDate()).toBe(5);
  });

  it("trailingPeriods() returns an oldest-first inclusive window ending at the given period", () => {
    expect(trailingPeriods("2026-07", 6)).toEqual([
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
    ]);
  });

  it("trailingPeriods() rolls across a year boundary", () => {
    expect(trailingPeriods("2026-02", 3)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });
});
