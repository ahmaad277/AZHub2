import { beforeEach, describe, expect, it, vi } from "vitest";

const cashflowJoinRows = [
  {
    cashflow: {
      id: "cf-1",
      investmentId: "inv-1",
      dueDate: new Date("2026-01-25T00:00:00.000Z"),
      amount: "30.00",
      type: "profit",
      status: "pending",
      receivedDate: null,
    },
    investment: {
      id: "inv-1",
      name: "Investment 1",
    },
    platform: {
      name: "Platform A",
    },
  },
];

const { requireOwnerMock, dbMock } = vi.hoisted(() => ({
  requireOwnerMock: vi.fn(async () => ({ id: "owner" })),
  dbMock: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn(async () => cashflowJoinRows),
            })),
          })),
        })),
      })),
    })),
  },
}));

vi.mock("@/lib/auth", () => ({
  requireOwner: requireOwnerMock,
}));

vi.mock("@/db", () => ({
  db: dbMock,
}));

import { GET } from "../cashflows/route";

function normalizeCashflowsPayload(payload: unknown) {
  if (Array.isArray(payload)) {
    return { variant: "array" as const, rows: payload, summary: null };
  }

  expect(payload).toBeTruthy();
  expect(typeof payload).toBe("object");
  expect(Object.keys(payload as Record<string, unknown>).sort()).toEqual([
    "rows",
    "summary",
  ]);

  const typedPayload = payload as {
    rows: unknown[];
    summary: { totalAmount: number };
  };

  return {
    variant: "object" as const,
    rows: typedPayload.rows,
    summary: typedPayload.summary,
  };
}

describe("cashflows route contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a backward-compatible payload shape", async () => {
    const response = await GET(
      new Request("http://localhost/api/cashflows?status=pending") as any,
    );
    const body = await response.json();
    const normalized = normalizeCashflowsPayload(body);

    expect(response.status).toBe(200);
    expect(requireOwnerMock).toHaveBeenCalledTimes(1);
    expect(normalized.rows).toHaveLength(1);
    expect(normalized.rows[0]).toMatchObject({
      id: expect.any(String),
      amount: expect.any(String),
      dueDate: expect.any(String),
      type: expect.any(String),
      status: expect.any(String),
      investment: {
        id: expect.any(String),
        name: expect.any(String),
        platform: {
          name: expect.any(String),
        },
      },
    });

    if (normalized.variant === "object") {
      expect(Object.keys(normalized.summary ?? {}).sort()).toEqual(["totalAmount"]);
      expect(normalized.summary).toEqual({ totalAmount: 30 });
    }
  });
});
