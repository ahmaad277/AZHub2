import { beforeEach, describe, expect, it, vi } from "vitest";

type FixtureInvestment = {
  id: string;
  platformId: string;
  principalAmount: string;
  expectedProfit: string;
  endDate: Date;
};

type FixtureCashflow = {
  id: string;
  investmentId: string;
  dueDate: Date;
  amount: string;
  type: "profit" | "principal";
  status: "pending" | "received";
};

type FixtureCashTransaction = {
  id: string;
  amount: string;
};

type DashboardFixture = {
  investments: FixtureInvestment[];
  cashflows: FixtureCashflow[];
  cashTransactions: FixtureCashTransaction[];
};

const NOW = new Date(Date.UTC(2026, 0, 15));

const { dbState, dbMock } = vi.hoisted(() => {
  const state: { fixture: DashboardFixture | null } = { fixture: null };

  const clone = <T>(rows: T[]) =>
    rows.map((row) =>
      typeof structuredClone === "function"
        ? structuredClone(row)
        : JSON.parse(JSON.stringify(row)),
    );

  const isInvestmentsTable = (table: Record<string, unknown>) =>
    "principalAmount" in table && "expectedProfit" in table && "endDate" in table;
  const isCashflowsTable = (table: Record<string, unknown>) =>
    "investmentId" in table && "dueDate" in table && "status" in table;
  const isCashTransactionsTable = (table: Record<string, unknown>) =>
    "referenceId" in table && "amount" in table && "date" in table;

  const resolveRows = (table: Record<string, unknown>) => {
    const fixture = state.fixture;
    if (!fixture) throw new Error("Test fixture not set.");

    if (isInvestmentsTable(table)) {
      return clone(
        fixture.investments.map((investment) => ({
          id: investment.id,
          principal: investment.principalAmount,
          expectedProfit: investment.expectedProfit,
          endDate: investment.endDate,
          platformId: investment.platformId,
        })),
      );
    }

    if (isCashflowsTable(table)) {
      return clone(
        fixture.cashflows.map((cashflow) => ({
          id: cashflow.id,
          investmentId: cashflow.investmentId,
          dueDate: cashflow.dueDate,
          amount: cashflow.amount,
          type: cashflow.type,
          status: cashflow.status,
        })),
      );
    }

    if (isCashTransactionsTable(table)) {
      return clone(
        fixture.cashTransactions.map((cashTransaction) => ({
          amount: cashTransaction.amount,
        })),
      );
    }

    return [];
  };

  const db = {
    select: vi.fn(() => ({
      from(table: Record<string, unknown>) {
        const rows = resolveRows(table);
        return {
          where: vi.fn(async () => rows),
          orderBy: vi.fn(async () => rows),
          limit: vi.fn(async (n: number) => rows.slice(0, n)),
        };
      },
    })),
  };

  return { dbState: state, dbMock: db };
});

vi.mock("@/db", () => ({ db: dbMock }));

import { getDashboardMetrics } from "../metrics";

const fixtures: Record<string, DashboardFixture> = {
  simple: {
    investments: [
      {
        id: "inv-simple",
        platformId: "platform-a",
        principalAmount: "1000.00",
        expectedProfit: "120.00",
        endDate: new Date(Date.UTC(2026, 6, 15)),
      },
    ],
    cashflows: [
      {
        id: "cf-simple-1",
        investmentId: "inv-simple",
        dueDate: new Date(Date.UTC(2025, 11, 15)),
        amount: "50.00",
        type: "profit",
        status: "received",
      },
      {
        id: "cf-simple-2",
        investmentId: "inv-simple",
        dueDate: new Date(Date.UTC(2026, 0, 25)),
        amount: "30.00",
        type: "profit",
        status: "pending",
      },
      {
        id: "cf-simple-3",
        investmentId: "inv-simple",
        dueDate: new Date(Date.UTC(2026, 1, 15)),
        amount: "30.00",
        type: "profit",
        status: "pending",
      },
      {
        id: "cf-simple-4",
        investmentId: "inv-simple",
        dueDate: new Date(Date.UTC(2026, 6, 15)),
        amount: "1000.00",
        type: "principal",
        status: "pending",
      },
    ],
    cashTransactions: [
      { id: "ctx-simple-1", amount: "250.00" },
      { id: "ctx-simple-2", amount: "50.00" },
    ],
  },
  medium: {
    investments: [
      {
        id: "inv-active",
        platformId: "platform-a",
        principalAmount: "1000.00",
        expectedProfit: "120.00",
        endDate: new Date(Date.UTC(2026, 6, 15)),
      },
      {
        id: "inv-late",
        platformId: "platform-b",
        principalAmount: "2000.00",
        expectedProfit: "300.00",
        endDate: new Date(Date.UTC(2026, 3, 15)),
      },
      {
        id: "inv-defaulted",
        platformId: "platform-c",
        principalAmount: "1500.00",
        expectedProfit: "225.00",
        endDate: new Date(Date.UTC(2025, 9, 1)),
      },
      {
        id: "inv-completed",
        platformId: "platform-d",
        principalAmount: "500.00",
        expectedProfit: "50.00",
        endDate: new Date(Date.UTC(2025, 11, 1)),
      },
    ],
    cashflows: [
      {
        id: "cf-active-r",
        investmentId: "inv-active",
        dueDate: new Date(Date.UTC(2025, 11, 15)),
        amount: "50.00",
        type: "profit",
        status: "received",
      },
      {
        id: "cf-active-p1",
        investmentId: "inv-active",
        dueDate: new Date(Date.UTC(2026, 0, 25)),
        amount: "30.00",
        type: "profit",
        status: "pending",
      },
      {
        id: "cf-active-p2",
        investmentId: "inv-active",
        dueDate: new Date(Date.UTC(2026, 1, 15)),
        amount: "30.00",
        type: "profit",
        status: "pending",
      },
      {
        id: "cf-active-principal",
        investmentId: "inv-active",
        dueDate: new Date(Date.UTC(2026, 6, 15)),
        amount: "1000.00",
        type: "principal",
        status: "pending",
      },
      {
        id: "cf-late-profit",
        investmentId: "inv-late",
        dueDate: new Date(Date.UTC(2026, 0, 10)),
        amount: "100.00",
        type: "profit",
        status: "pending",
      },
      {
        id: "cf-late-principal",
        investmentId: "inv-late",
        dueDate: new Date(Date.UTC(2026, 3, 15)),
        amount: "2000.00",
        type: "principal",
        status: "pending",
      },
      {
        id: "cf-default-profit",
        investmentId: "inv-defaulted",
        dueDate: new Date(Date.UTC(2025, 8, 1)),
        amount: "75.00",
        type: "profit",
        status: "pending",
      },
      {
        id: "cf-default-principal",
        investmentId: "inv-defaulted",
        dueDate: new Date(Date.UTC(2025, 9, 1)),
        amount: "1500.00",
        type: "principal",
        status: "pending",
      },
      {
        id: "cf-completed-profit",
        investmentId: "inv-completed",
        dueDate: new Date(Date.UTC(2025, 5, 1)),
        amount: "50.00",
        type: "profit",
        status: "received",
      },
      {
        id: "cf-completed-principal",
        investmentId: "inv-completed",
        dueDate: new Date(Date.UTC(2025, 11, 1)),
        amount: "500.00",
        type: "principal",
        status: "received",
      },
    ],
    cashTransactions: [
      { id: "ctx-medium-1", amount: "1000.00" },
      { id: "ctx-medium-2", amount: "-300.00" },
      { id: "ctx-medium-3", amount: "50.00" },
      { id: "ctx-medium-4", amount: "50.00" },
    ],
  },
  edgeStrict: {
    investments: [
      {
        id: "inv-edge",
        platformId: "platform-a",
        principalAmount: "800.00",
        expectedProfit: "200.00",
        endDate: new Date(Date.UTC(2026, 2, 16)),
      },
    ],
    cashflows: [
      {
        id: "cf-edge-1",
        investmentId: "inv-edge",
        dueDate: new Date(Date.UTC(2026, 1, 1)),
        amount: "100.00",
        type: "profit",
        status: "pending",
      },
      {
        id: "cf-edge-2",
        investmentId: "inv-edge",
        dueDate: new Date(Date.UTC(2026, 2, 1)),
        amount: "100.00",
        type: "profit",
        status: "pending",
      },
      {
        id: "cf-edge-3",
        investmentId: "inv-edge",
        dueDate: new Date(Date.UTC(2026, 2, 16)),
        amount: "800.00",
        type: "principal",
        status: "pending",
      },
    ],
    cashTransactions: [{ id: "ctx-edge-1", amount: "120.00" }],
  },
};

describe("getDashboardMetrics snapshots", () => {
  beforeEach(() => {
    dbState.fixture = null;
    vi.clearAllMocks();
  });

  it("matches the full metrics snapshot for simple", async () => {
    dbState.fixture = fixtures.simple;
    const metrics = await getDashboardMetrics({ now: NOW });
    expect(metrics).toMatchInlineSnapshot(`
      {
        "activeAnnualYieldPercent": 24.2,
        "activeCount": 1,
        "activePrincipal": 1000,
        "cashDragPercent": 23.08,
        "completedCount": 0,
        "defaultRatePercent": 0,
        "defaultedCount": 0,
        "expectedInflow30d": 30,
        "expectedInflow60d": 60,
        "expectedInflow90d": 60,
        "generatedAt": "2026-01-15T00:00:00.000Z",
        "lateCount": 0,
        "nav": 1300,
        "nextPayment": {
          "amount": 30,
          "dueDate": "2026-01-25T00:00:00.000Z",
          "investmentId": "inv-simple",
        },
        "overdueBalance": 0,
        "principalByStatus": {
          "active": 1000,
          "completed": 0,
          "defaulted": 0,
          "late": 0,
        },
        "realizedGains": 50,
        "totalCashBalance": 300,
        "totalExpectedProfit": 120,
        "wamDays": 181,
      }
    `);
  });

  it("matches the full metrics snapshot for medium", async () => {
    dbState.fixture = fixtures.medium;
    const metrics = await getDashboardMetrics({ now: NOW });
    expect(metrics).toMatchInlineSnapshot(`
      {
        "activeAnnualYieldPercent": 42.58,
        "activeCount": 2,
        "activePrincipal": 3000,
        "cashDragPercent": 21.05,
        "completedCount": 1,
        "defaultRatePercent": 39.47,
        "defaultedCount": 1,
        "expectedInflow30d": 30,
        "expectedInflow60d": 60,
        "expectedInflow90d": 2060,
        "generatedAt": "2026-01-15T00:00:00.000Z",
        "lateCount": 0,
        "nav": 3800,
        "nextPayment": {
          "amount": 30,
          "dueDate": "2026-01-25T00:00:00.000Z",
          "investmentId": "inv-active",
        },
        "overdueBalance": 1675,
        "principalByStatus": {
          "active": 3000,
          "completed": 500,
          "defaulted": 1500,
          "late": 0,
        },
        "realizedGains": 100,
        "totalCashBalance": 800,
        "totalExpectedProfit": 695,
        "wamDays": 120,
      }
    `);
  });

  it("matches the full metrics snapshot for edgeStrict", async () => {
    dbState.fixture = fixtures.edgeStrict;
    const metrics = await getDashboardMetrics({ now: NOW });
    expect(metrics).toMatchInlineSnapshot(`
      {
        "activeAnnualYieldPercent": 152.08,
        "activeCount": 1,
        "activePrincipal": 800,
        "cashDragPercent": 13.04,
        "completedCount": 0,
        "defaultRatePercent": 0,
        "defaultedCount": 0,
        "expectedInflow30d": 100,
        "expectedInflow60d": 1000,
        "expectedInflow90d": 1000,
        "generatedAt": "2026-01-15T00:00:00.000Z",
        "lateCount": 0,
        "nav": 920,
        "nextPayment": {
          "amount": 100,
          "dueDate": "2026-02-01T00:00:00.000Z",
          "investmentId": "inv-edge",
        },
        "overdueBalance": 0,
        "principalByStatus": {
          "active": 800,
          "completed": 0,
          "defaulted": 0,
          "late": 0,
        },
        "realizedGains": 0,
        "totalCashBalance": 120,
        "totalExpectedProfit": 200,
        "wamDays": 60,
      }
    `);
  });
});
