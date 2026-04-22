import { describe, it, expect } from "vitest";
import { roundToMoney, splitMoneyEvenly, sumMoney, parseMoney } from "../money";

describe("roundToMoney", () => {
  it("rounds to two decimals", () => {
    expect(roundToMoney(1.005)).toBe(1.01);
    expect(roundToMoney(1.004)).toBe(1);
    expect(roundToMoney(99.999)).toBe(100);
  });

  it("handles non-finite inputs", () => {
    expect(roundToMoney(Number.NaN)).toBe(0);
    expect(roundToMoney(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("splitMoneyEvenly", () => {
  it("splits evenly without residue", () => {
    expect(splitMoneyEvenly(90, 3)).toEqual([30, 30, 30]);
  });

  it("puts the halalah residue on the last element", () => {
    const res = splitMoneyEvenly(100, 3);
    expect(res.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 2);
    expect(res[0]).toBe(33.33);
    expect(res[1]).toBe(33.33);
    expect(res[2]).toBe(33.34);
  });

  it("handles 1 part", () => {
    expect(splitMoneyEvenly(100, 1)).toEqual([100]);
  });

  it("returns [] for invalid parts", () => {
    expect(splitMoneyEvenly(100, 0)).toEqual([]);
    expect(splitMoneyEvenly(100, -5)).toEqual([]);
  });
});

describe("sumMoney / parseMoney", () => {
  it("sums strings and numbers together", () => {
    expect(sumMoney(["10.5", 20, "5.25", null, undefined])).toBe(35.75);
  });
  it("parses strings safely", () => {
    expect(parseMoney("1,234.56")).toBe(0); // strict: commas are not parsed
    expect(parseMoney("1234.56")).toBe(1234.56);
    expect(parseMoney(null)).toBe(0);
  });
});
