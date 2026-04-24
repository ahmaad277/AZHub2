import { isGuardCliEntry, printReport } from "./_shared.mjs";
import { runCheck as runFrontendFinance } from "./check-no-frontend-finance-calculations.mjs";
import { runCheck as runNoToFixed } from "./check-no-tofixed.mjs";
import { runCheck as runProtectedRoutes } from "./check-protected-routes.mjs";

const enforcedChecks = [runFrontendFinance, runNoToFixed, runProtectedRoutes];

export async function runPartialEnforcement() {
  const results = [];
  for (const check of enforcedChecks) {
    results.push(await check());
  }
  return results;
}

if (isGuardCliEntry(import.meta.url)) {
  const results = await runPartialEnforcement();
  let totalFindings = 0;

  console.log("[guard] Running partial enforcement for blocking checks...");
  for (const result of results) {
    totalFindings += result.findings.length;
    printReport(result.name, result.findings, result.summary);
  }

  console.log(
    `\n[guard] Partial enforcement summary: ${results.length} checks, ${totalFindings} finding(s).`,
  );

  if (totalFindings > 0) {
    console.error(
      "[guard] Build blocked: blocking guard findings detected in enforced checks.",
    );
    process.exit(1);
  }

  console.log("[guard] Partial enforcement passed.");
}
