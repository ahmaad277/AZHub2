import { describe, expect, it } from "vitest";

import {
  VISION_TARGET_YEAR,
  buildProjectionSeries,
  compoundProjection,
  monthsBetweenUTC,
  pctToDecimal,
  requiredCAGR,
  startOfMonthUTC,
} from "../projection";

describe("requiredCAGR", () => {
  it("computes the compound rate that grows nav to target over the given years", () => {
    const r = requiredCAGR(100_000, 1_000_000, 15);
    // 10x over 15 years ≈ 16.59% / yr
    expect(r).toBeGreaterThan(0.1658);
    expect(r).toBeLessThan(0.166);
    // sanity: nav * (1+r)^15 ≈ target
    expect(100_000 * Math.pow(1 + r, 15)).toBeCloseTo(1_000_000, 0);
  });

  it("returns 0 when nav is non-positive", () => {
    expect(requiredCAGR(0, 1_000_000, 15)).toBe(0);
    expect(requiredCAGR(-50, 1_000_000, 15)).toBe(0);
  });

  it("returns 0 when target is non-positive", () => {
    expect(requiredCAGR(100_000, 0, 15)).toBe(0);
    expect(requiredCAGR(100_000, -10, 15)).toBe(0);
  });

  it("returns 0 when target already met (target <= nav)", () => {
    expect(requiredCAGR(500_000, 500_000, 15)).toBe(0);
    expect(requiredCAGR(600_000, 500_000, 15)).toBe(0);
  });

  it("returns 0 when years is non-positive", () => {
    expect(requiredCAGR(100_000, 1_000_000, 0)).toBe(0);
    expect(requiredCAGR(100_000, 1_000_000, -1)).toBe(0);
  });

  it("returns 0 for non-finite inputs", () => {
    expect(requiredCAGR(Number.NaN, 1_000_000, 15)).toBe(0);
    expect(requiredCAGR(100_000, Number.POSITIVE_INFINITY, 15)).toBe(0);
  });
});

describe("compoundProjection", () => {
  it("returns nav at index 0 and length months+1", () => {
    const series = compoundProjection(100_000, 0.12, 24);
    expect(series).toHaveLength(25);
    expect(series[0]).toBe(100_000);
  });

  it("monotonically grows for positive rate", () => {
    const series = compoundProjection(100_000, 0.1, 36);
    for (let i = 1; i < series.length; i++) {
      expect(series[i]).toBeGreaterThan(series[i - 1]);
    }
  });

  it("ends at nav*(1+r)^years for whole-year horizon", () => {
    const years = 10;
    const months = years * 12;
    const series = compoundProjection(100_000, 0.08, months);
    const expected = 100_000 * Math.pow(1.08, years);
    expect(series[series.length - 1]).toBeCloseTo(expected, 0);
  });

  it("stays flat when rate is 0", () => {
    const series = compoundProjection(50_000, 0, 12);
    for (const v of series) {
      expect(v).toBe(50_000);
    }
  });

  it("returns [] for negative months or non-finite inputs", () => {
    expect(compoundProjection(100, 0.1, -1)).toEqual([]);
    expect(compoundProjection(Number.NaN, 0.1, 12)).toEqual([]);
    expect(compoundProjection(100, Number.NaN, 12)).toEqual([]);
  });
});

describe("pctToDecimal", () => {
  it("converts percent to decimal", () => {
    expect(pctToDecimal(12)).toBeCloseTo(0.12, 10);
    expect(pctToDecimal(0)).toBe(0);
    expect(pctToDecimal(100)).toBe(1);
  });

  it("treats null/undefined/NaN as 0", () => {
    expect(pctToDecimal(null)).toBe(0);
    expect(pctToDecimal(undefined)).toBe(0);
    expect(pctToDecimal(Number.NaN)).toBe(0);
  });
});

describe("startOfMonthUTC / monthsBetweenUTC", () => {
  it("snaps to the 1st of the month at UTC midnight", () => {
    const snapped = startOfMonthUTC(new Date(Date.UTC(2026, 4, 24, 18, 30, 0)));
    expect(snapped.toISOString()).toBe("2026-05-01T00:00:00.000Z");
  });

  it("counts whole months across years", () => {
    const a = new Date(Date.UTC(2026, 0, 1));
    const b = new Date(Date.UTC(2040, 11, 1));
    expect(monthsBetweenUTC(a, b)).toBe(14 * 12 + 11);
  });
});

describe("buildProjectionSeries", () => {
  const startDate = new Date(Date.UTC(2026, 0, 15)); // Jan 2026 → Jan 1, 2026

  it("returns one point per month from start through Dec of endYear", () => {
    const series = buildProjectionSeries({
      navNow: 100_000,
      target: 1_000_000,
      historicalApyPct: 12,
      whatIfApyPct: null,
      planTargets: [],
      startDate,
      endYear: 2040,
    });
    // 2026-01 inclusive to 2040-12 inclusive = (14*12 + 11) = 179 month-steps → 180 points
    expect(series).toHaveLength(180);
    expect(series[0].month).toBe("2026-01-01T00:00:00.000Z");
    expect(series[series.length - 1].month).toBe("2040-12-01T00:00:00.000Z");
  });

  it("computes required, current and what-if when nav and target are valid", () => {
    const series = buildProjectionSeries({
      navNow: 100_000,
      target: 1_000_000,
      historicalApyPct: 10,
      whatIfApyPct: 20,
      planTargets: [],
      startDate,
    });
    const last = series[series.length - 1];
    expect(last.required).not.toBeNull();
    expect(last.current).not.toBeNull();
    expect(last.whatIf).not.toBeNull();
    // Required curve must land at the target (within rounding).
    expect(last.required as number).toBeCloseTo(1_000_000, 0);
    // What-if at 20% > current at 10% on the final month.
    expect(last.whatIf as number).toBeGreaterThan(last.current as number);
  });

  it("hides required when target <= nav (already achieved)", () => {
    const series = buildProjectionSeries({
      navNow: 1_500_000,
      target: 1_000_000,
      historicalApyPct: 10,
      whatIfApyPct: null,
      planTargets: [],
      startDate,
    });
    expect(series.every((p) => p.required === null)).toBe(true);
    // current still flows
    expect(series[0].current).toBe(1_500_000);
  });

  it("hides required and current when nav is 0", () => {
    const series = buildProjectionSeries({
      navNow: 0,
      target: 1_000_000,
      historicalApyPct: 10,
      whatIfApyPct: 15,
      planTargets: [],
      startDate,
    });
    for (const p of series) {
      expect(p.required).toBeNull();
      expect(p.current).toBeNull();
      expect(p.whatIf).toBeNull();
    }
  });

  it("merges plan rows by ISO month key", () => {
    const planTargets = [
      { month: new Date(Date.UTC(2026, 1, 1)), value: 110_000 },
      // Mid-month value should still snap to the 1st.
      { month: new Date(Date.UTC(2026, 2, 17, 9, 0, 0)), value: 120_000 },
      // Out-of-range row is silently dropped.
      { month: new Date(Date.UTC(2050, 0, 1)), value: 9_999_999 },
    ];
    const series = buildProjectionSeries({
      navNow: 100_000,
      target: 1_000_000,
      historicalApyPct: 10,
      whatIfApyPct: null,
      planTargets,
      startDate,
    });
    const find = (iso: string) => series.find((p) => p.month === iso);
    expect(find("2026-01-01T00:00:00.000Z")?.plan).toBeNull();
    expect(find("2026-02-01T00:00:00.000Z")?.plan).toBe(110_000);
    expect(find("2026-03-01T00:00:00.000Z")?.plan).toBe(120_000);
    expect(series.some((p) => p.plan === 9_999_999)).toBe(false);
  });

  it("accepts string values from API rows", () => {
    const series = buildProjectionSeries({
      navNow: 100_000,
      target: 1_000_000,
      historicalApyPct: 0,
      whatIfApyPct: null,
      planTargets: [{ month: "2026-04-01T00:00:00.000Z", value: "200000.00" }],
      startDate,
    });
    const hit = series.find((p) => p.month === "2026-04-01T00:00:00.000Z");
    expect(hit?.plan).toBe(200_000);
  });

  it("returns [] when start is past endYear", () => {
    const series = buildProjectionSeries({
      navNow: 100_000,
      target: 1_000_000,
      historicalApyPct: 10,
      whatIfApyPct: null,
      planTargets: [],
      startDate: new Date(Date.UTC(2041, 5, 1)),
      endYear: 2040,
    });
    expect(series).toEqual([]);
  });

  it("hides what-if when null", () => {
    const series = buildProjectionSeries({
      navNow: 100_000,
      target: 1_000_000,
      historicalApyPct: 10,
      whatIfApyPct: null,
      planTargets: [],
      startDate,
    });
    expect(series.every((p) => p.whatIf === null)).toBe(true);
  });

  it("exposes VISION_TARGET_YEAR = 2040 as the default", () => {
    expect(VISION_TARGET_YEAR).toBe(2040);
  });
});
