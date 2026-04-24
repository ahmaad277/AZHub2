import { isGuardCliEntry, printReport } from "./_shared.mjs";
import { runCheck as runFrontendFinance } from "./check-no-frontend-finance-calculations.mjs";
import { runCheck as runRandomUiLibraries } from "./check-no-random-ui-libraries.mjs";
import { runCheck as runDashboardMetricsSource } from "./check-dashboard-metrics-source.mjs";
import { runCheck as runNoToFixed } from "./check-no-tofixed.mjs";
import { runCheck as runProtectedRoutes } from "./check-protected-routes.mjs";

const checks = [
  runFrontendFinance,
  runRandomUiLibraries,
  runDashboardMetricsSource,
  runNoToFixed,
  runProtectedRoutes,
];

export async function runAllChecks() {
  const results = [];
  for (const check of checks) {
    results.push(await check());
  }
  return results;
}

if (isGuardCliEntry(import.meta.url)) {
  const results = await runAllChecks();
  let totalFindings = 0;

  console.log("[guard] Running all non-blocking AZHub guard scripts...");
  for (const result of results) {
    totalFindings += result.findings.length;
    printReport(result.name, result.findings, result.summary);
  }

  console.log(`\n[guard] Summary: ${results.length} checks, ${totalFindings} finding(s).`);
  console.log("[guard] Batch 2 mode: findings are report-only and do not fail the process.");
}
