import { describe, it, expect } from "vitest";
import {
  addMonths,
  endDateFromDuration,
  durationFromEndDate,
  daysBetween,
} from "../date-smart";

describe("addMonths", () => {
  it("adds months normally", () => {
    const r = addMonths(new Date(Date.UTC(2026, 0, 15)), 6);
    expect(r.getUTCMonth()).toBe(6);
    expect(r.getUTCFullYear()).toBe(2026);
    expect(r.getUTCDate()).toBe(15);
  });

  it("clamps day-of-month when target month is shorter", () => {
    // Jan 31 + 1 month -> Feb 28 (or 29 in leap year)
    const r = addMonths(new Date(Date.UTC(2026, 0, 31)), 1);
    expect(r.getUTCMonth()).toBe(1); // February
    expect(r.getUTCDate()).toBe(28);
  });
});

describe("duration <-> endDate round-trip", () => {
  it("is symmetric for whole months", () => {
    const start = new Date(Date.UTC(2026, 0, 10));
    const end = endDateFromDuration(start, 12);
    expect(durationFromEndDate(start, end)).toBe(12);
  });

  it("floors when endDate day is before start day", () => {
    const start = new Date(Date.UTC(2026, 0, 15));
    const end = new Date(Date.UTC(2026, 6, 14));
    expect(durationFromEndDate(start, end)).toBe(5);
  });

  it("minimum 1 month", () => {
    const start = new Date(Date.UTC(2026, 0, 15));
    const end = new Date(Date.UTC(2026, 0, 20));
    expect(durationFromEndDate(start, end)).toBe(1);
  });
});

describe("daysBetween", () => {
  it("returns integer day difference", () => {
    const a = new Date(Date.UTC(2026, 0, 1));
    const b = new Date(Date.UTC(2026, 0, 11));
    expect(daysBetween(a, b)).toBe(10);
  });
});
