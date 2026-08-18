import { describe, expect, it } from "vitest";

import { buildFinanceFacts } from "./finance-facts.js";

// Minimal Decimal stand-in with real arithmetic, matching the subset of the
// Prisma.Decimal API buildFinanceFacts() actually calls -- enough to prove
// every percentage/ranking is computed via Decimal arithmetic, never a JS
// float, without depending on the generated Prisma client in a unit test.
class FakeDecimal {
  constructor(private readonly value: number) {}
  minus(other: FakeDecimal) {
    return new FakeDecimal(this.value - other.value);
  }
  dividedBy(other: FakeDecimal) {
    return new FakeDecimal(this.value / other.value);
  }
  times(n: number) {
    return new FakeDecimal(this.value * n);
  }
  comparedTo(other: FakeDecimal) {
    return this.value - other.value;
  }
  isZero() {
    return this.value === 0;
  }
  toFixed(digits: number) {
    return this.value.toFixed(digits);
  }
}

function d(value: number) {
  return new FakeDecimal(value) as never;
}

describe("buildFinanceFacts", () => {
  it("never substitutes totalExpenses for a missing monthlyLimit -- percentageOfBudget is null when hasBudget is false", () => {
    const facts = buildFinanceFacts(d(809.32), null, [
      { category: "FOOD", total: d(145.42) },
      { category: "TRANSPORTATION", total: d(13.9) },
    ]);

    expect(facts.hasBudget).toBe(false);
    for (const entry of facts.categoryPercentages) {
      expect(entry.percentageOfBudget).toBeNull();
      // percentageOfTotalSpending is unaffected by the missing budget --
      // proves the two denominators are computed independently, not one
      // falling back to the other.
      expect(entry.percentageOfTotalSpending).not.toBeNull();
    }
  });

  it("computes percentageOfBudget as category total / monthlyLimit, matching the corrected T3 ground truth (9.7%, not 11%)", () => {
    const facts = buildFinanceFacts(d(809.32), d(1500), [
      { category: "FOOD", total: d(145.42) },
      { category: "HOUSING", total: d(650) },
      { category: "TRANSPORTATION", total: d(13.9) },
    ]);

    const food = facts.categoryPercentages.find((c) => c.category === "FOOD");
    expect(food?.percentageOfBudget).toBe("9.7");
  });

  it("computes percentageOfTotalSpending as category total / totalExpenses", () => {
    const facts = buildFinanceFacts(d(809.32), d(1500), [
      { category: "FOOD", total: d(145.42) },
    ]);

    const food = facts.categoryPercentages.find((c) => c.category === "FOOD");
    expect(food?.percentageOfTotalSpending).toBe("18.0");
  });

  it("returns percentageOfTotalSpending: null when totalExpenses is zero, instead of dividing by zero", () => {
    const facts = buildFinanceFacts(d(0), d(1500), [{ category: "FOOD", total: d(0) }]);

    expect(facts.categoryPercentages[0].percentageOfTotalSpending).toBeNull();
  });

  it("ranks categories strictly by numeric total, descending, independent of input array order", () => {
    const facts = buildFinanceFacts(d(809.32), d(1500), [
      { category: "FOOD", total: d(145.42) },
      { category: "TRANSPORTATION", total: d(13.9) },
      { category: "HOUSING", total: d(650) },
    ]);

    expect(facts.categoryRanking.map((c) => c.category)).toEqual([
      "HOUSING",
      "FOOD",
      "TRANSPORTATION",
    ]);
    expect(facts.categoryRanking.map((c) => c.rank)).toEqual([1, 2, 3]);
  });

  it("does not mutate or reorder the input categoryTotals array while ranking", () => {
    const input = [
      { category: "FOOD" as const, total: d(145.42) },
      { category: "HOUSING" as const, total: d(650) },
    ];

    buildFinanceFacts(d(795.42), d(1500), input);

    expect(input.map((c) => c.category)).toEqual(["FOOD", "HOUSING"]);
  });

  it("always reports hasCategorySpecificThresholds: false -- no per-category limit concept exists in the schema", () => {
    const facts = buildFinanceFacts(d(809.32), d(1500), [{ category: "FOOD", total: d(145.42) }]);

    expect(facts.hasCategorySpecificThresholds).toBe(false);
  });

  it("returns hasBudget: true and a non-null percentageOfBudget when a budget is configured", () => {
    const facts = buildFinanceFacts(d(795.42), d(1500), [{ category: "HOUSING", total: d(650) }]);

    expect(facts.hasBudget).toBe(true);
    expect(facts.categoryPercentages[0].percentageOfBudget).not.toBeNull();
  });
});
