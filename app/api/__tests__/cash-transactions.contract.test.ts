import { beforeEach, describe, expect, it, vi } from "vitest";

const cashTransactionJoinRows = [
  {
    tx: {
      id: "tx-1",
      date: new Date("2026-01-20T00:00:00.000Z"),
      amount: "100.00",
      type: "deposit",
      notes: "Seed deposit",
    },
    platform: {
      name: "Platform A",
    },
  },
  {
    tx: {
      id: "tx-2",
      date: new Date("2026-01-21T00:00:00.000Z"),
      amount: "-40.00",
      type: "withdrawal",
      notes: "Cash out",
    },
    platform: null,
  },
  {
    tx: {
      id: "tx-3",
      date: new Date("2026-01-22T00:00:00.000Z"),
      amount: "15.00",
      type: "cashflow_receipt",
      notes: "Receipt",
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
        leftJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(async () => cashTransactionJoinRows),
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

import { GET } from "../cash-transactions/route";

function normalizeCashTransactionsPayload(payload: unknown) {
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
    summary: {
      balance: number;
      deposits: number;
      withdrawals: number;
      receipts: number;
    };
  };

  return {
    variant: "object" as const,
    rows: typedPayload.rows,
    summary: typedPayload.summary,
  };
}

describe("cash-transactions route contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a backward-compatible payload shape", async () => {
    const response = await GET(
      new Request("http://localhost/api/cash-transactions?platformId=platform-a") as any,
    );
    const body = await response.json();
    const normalized = normalizeCashTransactionsPayload(body);

    expect(response.status).toBe(200);
    expect(requireOwnerMock).toHaveBeenCalledTimes(1);
    expect(normalized.rows).toHaveLength(3);
    expect(normalized.rows[0]).toMatchObject({
      id: expect.any(String),
      amount: expect.any(String),
      date: expect.any(String),
      type: expect.any(String),
    });

    if (normalized.variant === "object") {
      expect(Object.keys(normalized.summary ?? {}).sort()).toEqual([
        "balance",
        "deposits",
        "receipts",
        "withdrawals",
      ]);
      expect(normalized.summary).toEqual({
        balance: 75,
        deposits: 100,
        withdrawals: -40,
        receipts: 15,
      });
    }
  });
});
