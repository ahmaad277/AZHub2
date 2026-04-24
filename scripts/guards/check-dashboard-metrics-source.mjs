import {
  createResult,
  isGuardCliEntry,
  printReport,
  readText,
  relativePath,
  walkFiles,
} from "./_shared.mjs";

const NAME = "check-dashboard-metrics-source";

const APPROVED_METRICS_FILES = new Set([
  "app/api/dashboard/metrics/route.ts",
  "lib/finance/metrics.ts",
]);

export async function runCheck() {
  const findings = [];

  const routePath = "app/api/dashboard/metrics/route.ts";
  const routeSource = readText(routePath);
  if (!routeSource.includes('from "@/lib/finance/metrics"')) {
    findings.push({
      file: routePath,
      message: "Dashboard metrics route is not importing from `@/lib/finance/metrics`.",
    });
  }
  if (!routeSource.includes("getDashboardMetrics")) {
    findings.push({
      file: routePath,
      message: "Dashboard metrics route does not call `getDashboardMetrics`.",
    });
  }

  const candidateFiles = [
    ...walkFiles("app", [".ts", ".tsx"], {
      exclude: (relPath) => relPath.startsWith("app/api/dashboard/metrics/"),
    }),
    ...walkFiles("lib", [".ts", ".tsx"], {
      exclude: (relPath) => relPath === "lib/finance/metrics.ts",
    }),
  ];

  for (const file of candidateFiles) {
    const relPath = relativePath(file);
    const base = relPath.split("/").pop() ?? "";
    if (
      (base === "metrics.ts" || base === "metrics.tsx" || relPath.includes("dashboard/metrics")) &&
      !APPROVED_METRICS_FILES.has(relPath)
    ) {
      findings.push({
        file: relPath,
        message: "Potential parallel dashboard metrics source detected outside the approved files.",
      });
    }
  }

  return createResult(
    NAME,
    findings,
    "Report-only in Batch 2: checks the frozen dashboard metrics source wiring.",
  );
}

if (isGuardCliEntry(import.meta.url)) {
  const result = await runCheck();
  printReport(result.name, result.findings, result.summary);
}
