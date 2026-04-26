import { describe, it, expect } from "vitest";
import { classifyResolvedIssueDays, resolveStatus } from "../status-resolver";

const NOW = new Date(Date.UTC(2026, 5, 1));

describe("resolveStatus", () => {
  it("returns active when no cashflows overdue and pending exist", () => {
    const r = resolveStatus(
      {
        endDate: new Date(Date.UTC(2027, 0, 1)),
        cashflows: [
          {
            status: "pending",
            dueDate: new Date(Date.UTC(2026, 6, 1)),
            type: "principal",
          },
        ],
      },
      NOW,
    );
    expect(r.status).toBe("active");
  });

  it("returns late when overdue within grace window", () => {
    const r = resolveStatus(
      {
        endDate: new Date(Date.UTC(2027, 0, 1)),
        cashflows: [
          {
            status: "pending",
            dueDate: new Date(Date.UTC(2026, 4, 10)),
            type: "principal",
          }, // ~22 days late
        ],
      },
      NOW,
    );
    expect(r.status).toBe("late");
    expect(r.overdueDays).toBeGreaterThan(0);
  });

  it("returns defaulted when overdue past grace", () => {
    const r = resolveStatus(
      {
        endDate: new Date(Date.UTC(2027, 0, 1)),
        cashflows: [
          {
            status: "pending",
            dueDate: new Date(Date.UTC(2026, 0, 1)),
            type: "principal",
          }, // ~151 days late
        ],
      },
      NOW,
    );
    expect(r.status).toBe("defaulted");
  });

  it("returns completed when all cashflows received", () => {
    const r = resolveStatus(
      {
        endDate: new Date(Date.UTC(2026, 0, 1)),
        cashflows: [
          {
            status: "received",
            dueDate: new Date(Date.UTC(2025, 10, 1)),
            type: "profit",
          },
          {
            status: "received",
            dueDate: new Date(Date.UTC(2026, 0, 1)),
            type: "principal",
          },
        ],
      },
      NOW,
    );
    expect(r.status).toBe("completed");
  });

  it("ignores overdue profit cashflows when principal is not overdue", () => {
    const r = resolveStatus(
      {
        endDate: new Date(Date.UTC(2027, 0, 1)),
        cashflows: [
          {
            status: "pending",
            dueDate: new Date(Date.UTC(2026, 0, 1)),
            type: "profit",
          },
          {
            status: "pending",
            dueDate: new Date(Date.UTC(2026, 6, 1)),
            type: "principal",
          },
        ],
      },
      NOW,
    );

    expect(r.status).toBe("active");
    expect(r.overdueDays).toBe(0);
  });

  it("classifies resolved issue duration", () => {
    expect(classifyResolvedIssueDays(0)).toBeNull();
    expect(classifyResolvedIssueDays(24)).toBe("late");
    expect(classifyResolvedIssueDays(91)).toBe("defaulted");
  });
});
