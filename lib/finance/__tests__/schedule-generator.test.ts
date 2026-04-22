import { describe, it, expect } from "vitest";
import { generateSchedule } from "../schedule-generator";

describe("generateSchedule — monthly", () => {
  it("creates N profit rows + 1 principal row", () => {
    const start = new Date(Date.UTC(2026, 0, 15));
    const end = new Date(Date.UTC(2026, 11, 15));
    const rows = generateSchedule({
      startDate: start,
      endDate: end,
      durationMonths: 12,
      principalAmount: 100_000,
      expectedProfit: 6_000,
      frequency: "monthly",
    });
    expect(rows).toHaveLength(13);
    const profits = rows.filter((r) => r.type === "profit");
    const principals = rows.filter((r) => r.type === "principal");
    expect(profits).toHaveLength(12);
    expect(principals).toHaveLength(1);
    expect(principals[0].amount).toBe(100_000);
    const profitTotal = profits.reduce((a, b) => a + b.amount, 0);
    expect(Math.round(profitTotal * 100) / 100).toBe(6_000);
    expect(principals[0].dueDate.getTime()).toBe(end.getTime());
  });

  it("does not lose halala on awkward splits", () => {
    const start = new Date(Date.UTC(2026, 0, 1));
    const end = new Date(Date.UTC(2026, 2, 1));
    const rows = generateSchedule({
      startDate: start,
      endDate: end,
      durationMonths: 3,
      principalAmount: 10_000,
      expectedProfit: 100,
      frequency: "monthly",
    });
    const profits = rows.filter((r) => r.type === "profit");
    expect(profits).toHaveLength(3);
    const sum = Math.round(profits.reduce((a, b) => a + b.amount, 0) * 100) / 100;
    expect(sum).toBe(100);
  });
});

describe("generateSchedule — quarterly / annually / at_maturity", () => {
  it("quarterly generates 4 rows over 12 months", () => {
    const start = new Date(Date.UTC(2026, 0, 1));
    const end = new Date(Date.UTC(2026, 11, 31));
    const rows = generateSchedule({
      startDate: start,
      endDate: end,
      durationMonths: 12,
      principalAmount: 50_000,
      expectedProfit: 2_000,
      frequency: "quarterly",
    });
    const profits = rows.filter((r) => r.type === "profit");
    expect(profits).toHaveLength(4);
  });

  it("annually generates 1 profit row + principal", () => {
    const start = new Date(Date.UTC(2026, 0, 1));
    const end = new Date(Date.UTC(2026, 11, 31));
    const rows = generateSchedule({
      startDate: start,
      endDate: end,
      durationMonths: 12,
      principalAmount: 50_000,
      expectedProfit: 2_000,
      frequency: "annually",
    });
    expect(rows.filter((r) => r.type === "profit")).toHaveLength(1);
  });

  it("at_maturity puts profit + principal on endDate", () => {
    const start = new Date(Date.UTC(2026, 0, 1));
    const end = new Date(Date.UTC(2027, 0, 1));
    const rows = generateSchedule({
      startDate: start,
      endDate: end,
      durationMonths: 12,
      principalAmount: 50_000,
      expectedProfit: 5_000,
      frequency: "at_maturity",
    });
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(r.dueDate.getTime()).toBe(end.getTime());
    }
  });

  it("custom returns no rows (caller provides them)", () => {
    const rows = generateSchedule({
      startDate: new Date(),
      endDate: new Date(),
      durationMonths: 3,
      principalAmount: 1000,
      expectedProfit: 100,
      frequency: "custom",
    });
    expect(rows).toEqual([]);
  });
});
