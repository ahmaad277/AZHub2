import { beforeEach, describe, expect, it, vi } from "vitest";

const metricsFixture = {
  totalCashBalance: 800,
  activePrincipal: 3000,
  nav: 3800,
  cashDragPercent: 21.05,
  realizedGains: 100,
  expectedInflow30d: 30,
  expectedInflow60d: 60,
  expectedInflow90d: 2060,
  wamDays: 120,
  defaultRatePercent: 39.47,
  activeAnnualYieldPercent: 42.58,
  activeCount: 1,
  lateCount: 1,
  defaultedCount: 1,
  completedCount: 1,
  totalExpectedProfit: 695,
  overdueBalance: 1675,
  nextPayment: {
    amount: 30,
    dueDate: "2026-01-25T00:00:00.000Z",
    investmentId: "inv-active",
  },
  generatedAt: "2026-01-15T00:00:00.000Z",
};

const breakdownFixture = [
  {
    platformId: "platform-a",
    platformName: "Platform A",
    activePrincipal: 3000,
    realizedGains: 100,
    expectedProfit: 695,
    investmentsCount: 4,
  },
];

const { requireOwnerMock, getDashboardMetricsMock, getPlatformBreakdownMock } =
  vi.hoisted(() => ({
    requireOwnerMock: vi.fn(async () => ({ id: "owner" })),
    getDashboardMetricsMock: vi.fn(async () => metricsFixture),
    getPlatformBreakdownMock: vi.fn(async () => breakdownFixture),
  }));

vi.mock("@/lib/auth", () => ({
  requireOwner: requireOwnerMock,
}));

vi.mock("@/lib/finance/metrics", () => ({
  getDashboardMetrics: getDashboardMetricsMock,
  getPlatformBreakdown: getPlatformBreakdownMock,
}));

import { GET } from "../dashboard/metrics/route";

const expectedMetricKeys = [
  "activeAnnualYieldPercent",
  "activeCount",
  "activePrincipal",
  "cashDragPercent",
  "completedCount",
  "defaultRatePercent",
  "defaultedCount",
  "expectedInflow30d",
  "expectedInflow60d",
  "expectedInflow90d",
  "generatedAt",
  "lateCount",
  "nav",
  "nextPayment",
  "overdueBalance",
  "realizedGains",
  "totalCashBalance",
  "totalExpectedProfit",
  "wamDays",
].sort();

describe("dashboard metrics route contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the expected default response shape", async () => {
    const response = await GET(new Request("http://localhost/api/dashboard/metrics") as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(requireOwnerMock).toHaveBeenCalledTimes(1);
    expect(getDashboardMetricsMock).toHaveBeenCalledWith({ platformId: undefined });
    expect(Object.keys(body).sort()).toEqual(["metrics"]);
    expect(Object.keys(body.metrics).sort()).toEqual(expectedMetricKeys);
    expect(body.metrics.nextPayment).toMatchObject({
      amount: expect.any(Number),
      dueDate: expect.any(String),
      investmentId: expect.any(String),
    });
  });

  it("returns breakdown when requested without changing the top-level contract", async () => {
    const response = await GET(
      new Request("http://localhost/api/dashboard/metrics?breakdown=true&platformId=platform-a") as any,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getDashboardMetricsMock).toHaveBeenCalledWith({ platformId: "platform-a" });
    expect(getPlatformBreakdownMock).toHaveBeenCalledTimes(1);
    expect(Object.keys(body).sort()).toEqual(["breakdown", "metrics"]);
    expect(body.breakdown).toEqual([
      {
        platformId: expect.any(String),
        platformName: expect.any(String),
        activePrincipal: expect.any(Number),
        realizedGains: expect.any(Number),
        expectedProfit: expect.any(Number),
        investmentsCount: expect.any(Number),
      },
    ]);
  });
});
