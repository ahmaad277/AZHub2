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

import { daysBetween } from "../date-smart";
import { getDashboardMetrics } from "../metrics";
import { roundToMoney, sumMoney } from "../money";

const mediumFixture: DashboardFixture = {
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
};

const edgeStrictFixture: DashboardFixture = {
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
};

describe("getDashboardMetrics invariants", () => {
  beforeEach(() => {
    dbState.fixture = null;
    vi.clearAllMocks();
  });

  it("keeps nav equal to active principal plus total cash balance", async () => {
    dbState.fixture = mediumFixture;
    const metrics = await getDashboardMetrics({ now: NOW });

    expect(metrics.nav).toBe(
      roundToMoney(metrics.activePrincipal + metrics.totalCashBalance),
    );
  });

  it("keeps realized gains strict with no fallback behavior", async () => {
    dbState.fixture = edgeStrictFixture;
    const metrics = await getDashboardMetrics({ now: NOW });

    expect(metrics.realizedGains).toBe(0);
    expect(metrics.totalExpectedProfit).toBe(200);
  });

  it("keeps WAM calculation consistent with principal weighting", async () => {
    dbState.fixture = mediumFixture;
    const metrics = await getDashboardMetrics({ now: NOW });

    const activeAndLate = mediumFixture.investments.filter((investment) =>
      investment.id === "inv-active" || investment.id === "inv-late",
    );
    const expectedWam = Math.round(
      activeAndLate.reduce(
        (sum, investment) =>
          sum +
          Number(investment.principalAmount) *
            Math.max(1, daysBetween(NOW, investment.endDate)),
        0,
      ) /
        activeAndLate.reduce(
          (sum, investment) => sum + Number(investment.principalAmount),
          0,
        ),
    );

    expect(metrics.wamDays).toBe(expectedWam);
  });

  it("keeps default rate calculation consistent with defaulted principal over nav", async () => {
    dbState.fixture = mediumFixture;
    const metrics = await getDashboardMetrics({ now: NOW });

    const defaultedPrincipal = roundToMoney(1500);
    const expectedDefaultRate = roundToMoney(
      (defaultedPrincipal / metrics.nav) * 100,
    );

    expect(metrics.defaultRatePercent).toBe(expectedDefaultRate);
  });

  it("keeps active annual yield tied to the active-set expected profit weighting logic", async () => {
    dbState.fixture = mediumFixture;
    const metrics = await getDashboardMetrics({ now: NOW });

    const expectedProfitActive = sumMoney(["120.00", "300.00"]);
    const expectedYield = roundToMoney(
      (expectedProfitActive / metrics.activePrincipal) * (365 / metrics.wamDays) * 100,
    );

    expect(metrics.activeAnnualYieldPercent).toBe(expectedYield);
  });

  it("partitions book principal across principalByStatus for pie weighting", async () => {
    dbState.fixture = mediumFixture;
    const metrics = await getDashboardMetrics({ now: NOW });
    const bookTotal = roundToMoney(
      mediumFixture.investments.reduce((s, inv) => s + Number(inv.principalAmount), 0),
    );
    const sliceSum = roundToMoney(
      metrics.principalByStatus.active +
        metrics.principalByStatus.late +
        metrics.principalByStatus.defaulted +
        metrics.principalByStatus.completed,
    );
    expect(sliceSum).toBe(bookTotal);
  });
});
