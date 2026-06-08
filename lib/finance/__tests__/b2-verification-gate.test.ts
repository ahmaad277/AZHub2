/**
 * B2 Verification Gate — end-to-end contract test for the Core Product Spine.
 *
 * Verifies the full chain:
 *   1. Compute metrics from a fixture with an active investment
 *   2. Verify 9 canonical metrics render
 *   3. Simulate receiving one cashflow
 *   4. Verify totalCashBalance increased by exactly the received amount
 *   5. Simulate undoing that receipt
 *   6. Verify totalCashBalance decreased back by the same amount
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

type FixtureInvestment = {
  id: string;
  platformId: string;
  principalAmount: string;
  expectedProfit: string;
  expectedIrr: string;
  startDate: Date;
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
          expectedIrr: investment.expectedIrr,
          startDate: investment.startDate,
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

/**
 * B2-level fixture: one active investment with 2 pending cashflows,
 * plus a starting cash balance.
 */
const b2Fixture: DashboardFixture = {
  investments: [
    {
      id: "inv-b2",
      platformId: "plat-1",
      principalAmount: "5000",
      expectedProfit: "500",
      expectedIrr: "10.0000",
      startDate: new Date(Date.UTC(2026, 0, 1)),
      endDate: new Date(Date.UTC(2027, 0, 1)),
    },
  ],
  cashflows: [
    {
      id: "cf-b2-profit",
      investmentId: "inv-b2",
      dueDate: new Date(Date.UTC(2026, 1, 15)),
      amount: "250",
      type: "profit",
      status: "pending",
    },
    {
      id: "cf-b2-principal",
      investmentId: "inv-b2",
      dueDate: new Date(Date.UTC(2027, 0, 1)),
      amount: "5000",
      type: "principal",
      status: "pending",
    },
  ],
  cashTransactions: [
    { id: "tx-b2-1", amount: "1000" },
  ],
};

describe("B2 verification gate", () => {
  beforeEach(() => {
    dbState.fixture = structuredClone(b2Fixture);
  });

  it("produces 9 canonical metrics from an active investment", async () => {
    const metrics = await getDashboardMetrics({ now: NOW });

    // Verify all 9 canonical metrics are present and non-negative where expected.
    expect(metrics.totalCashBalance).toBeGreaterThanOrEqual(0);
    expect(metrics.activePrincipal).toBeGreaterThanOrEqual(0);
    expect(metrics.nav).toBeGreaterThanOrEqual(0);
    expect(metrics.cashDragPercent).toBeGreaterThanOrEqual(0);
    expect(metrics.realizedGains).toBeGreaterThanOrEqual(0);
    expect(metrics.wamDays).toBeGreaterThanOrEqual(0);
    expect(metrics.weightedOriginalDurationDays).toBeGreaterThanOrEqual(0);
    expect(metrics.defaultRatePercent).toBeGreaterThanOrEqual(0);
    expect(metrics.activeAnnualYieldPercent).toBeGreaterThanOrEqual(0);
    expect(metrics.historicalAnnualYieldPercent).toBeGreaterThanOrEqual(0);

    // Nav invariant: must equal principal exposure + cash + pending profits
    const expectedNav = 5000 + 1000 + 250;
    expect(metrics.nav).toBe(expectedNav);

    // Cash balance is exactly the sum of cash transactions
    expect(metrics.totalCashBalance).toBe(1000);

    // Active principal is 5000 (only active investment)
    expect(metrics.activePrincipal).toBe(5000);

    // One active investment
    expect(metrics.activeCount).toBe(1);

    // Expected inflow should include the pending profit cashflow
    expect(metrics.expectedInflow30d).toBeGreaterThanOrEqual(0);
    expect(metrics.expectedInflow60d).toBeGreaterThanOrEqual(0);
    expect(metrics.expectedInflow90d).toBeGreaterThanOrEqual(0);
  });

  it("cash balance increases by exactly the received amount after marking a cashflow received", async () => {
    // Step 1: initial state
    const before = await getDashboardMetrics({ now: NOW });
    const initialCash = before.totalCashBalance;

    // Step 2: simulate receiving the profit cashflow
    // Mark the profit cashflow as received and add a matching cash_transaction row
    dbState.fixture!.cashflows = dbState.fixture!.cashflows.map((cf) =>
      cf.id === "cf-b2-profit"
        ? { ...cf, status: "received" as const }
        : cf,
    );

    dbState.fixture!.cashTransactions = [
      ...dbState.fixture!.cashTransactions,
      { id: "tx-b2-receipt", amount: "250" }, // received profit amount
    ];

    // Step 3: verify cash balance increased by exactly 250
    const after = await getDashboardMetrics({ now: NOW });
    expect(after.totalCashBalance).toBe(initialCash + 250);
    expect(after.realizedGains).toBe(250);
  });

  it("cash balance decreases by the same amount after undoing a receipt", async () => {
    // Step 1: initial state
    const before = await getDashboardMetrics({ now: NOW });
    const initialCash = before.totalCashBalance;

    // Step 2: receive the profit cashflow
    dbState.fixture!.cashflows = dbState.fixture!.cashflows.map((cf) =>
      cf.id === "cf-b2-profit"
        ? { ...cf, status: "received" as const }
        : cf,
    );
    dbState.fixture!.cashTransactions.push({ id: "tx-b2-receipt", amount: "250" });

    const afterReceive = await getDashboardMetrics({ now: NOW });
    expect(afterReceive.totalCashBalance).toBe(initialCash + 250);

    // Step 3: undo receipt (reversing entry pattern from DB-R-040)
    // Reset cashflow status and add a negating cash_transaction
    dbState.fixture!.cashflows = dbState.fixture!.cashflows.map((cf) =>
      cf.id === "cf-b2-profit"
        ? { ...cf, status: "pending" as const }
        : cf,
    );
    dbState.fixture!.cashTransactions.push({ id: "tx-b2-reverse", amount: "-250" });

    // Step 4: verify cash balance decreased back to exactly the original amount
    const afterUndo = await getDashboardMetrics({ now: NOW });
    expect(afterUndo.totalCashBalance).toBe(initialCash);
    expect(afterUndo.realizedGains).toBe(0); // No more received profits
  });

  it("default rate is zero when no investments are defaulted", async () => {
    const metrics = await getDashboardMetrics({ now: NOW });
    expect(metrics.defaultRatePercent).toBe(0);
    expect(metrics.defaultedCount).toBe(0);
  });

  it("WAM is computed with principal weighting for the active investment", async () => {
    const metrics = await getDashboardMetrics({ now: NOW });
    // 351 days remaining from Jan 15, 2026 to Jan 1, 2027 for a 5000-principal investment
    // wamDays = (5000 * 351) / 5000 = 351
    expect(metrics.wamDays).toBe(351);
  });
});
