import {
  createResult,
  findLineFindings,
  isGuardCliEntry,
  printReport,
  relativePath,
  walkFiles,
} from "./_shared.mjs";

const NAME = "check-no-frontend-finance-calculations";

const MONEY_WORDS =
  "(amount|principal|profit|cash|balance|nav|yield|inflow|realized|expected)";

function getUiFiles() {
  const appFiles = walkFiles("app", [".ts", ".tsx"], {
    exclude: (relPath) =>
      relPath.startsWith("app/api/") ||
      relPath.endsWith(".test.ts") ||
      relPath.endsWith(".test.tsx"),
  });
  const componentFiles = walkFiles("components", [".ts", ".tsx"], {
    exclude: (relPath) =>
      relPath.startsWith("components/ui/") ||
      relPath.endsWith(".test.ts") ||
      relPath.endsWith(".test.tsx"),
  });

  return [...appFiles, ...componentFiles];
}

export async function runCheck() {
  const findings = [];
  const riskyFinanceImport =
    /\b(sumMoney|roundToMoney|parseMoney|splitMoneyEvenly|getDashboardMetrics|generateSchedule|resolveStatus)\b/;
  const reduceRegex = new RegExp(
    String.raw`reduce\([^)]*=>[^)]*\+\s*Number\([^)]*${MONEY_WORDS}[^)]*\)`,
    "i",
  );
  const numberMoneyRegex = new RegExp(
    String.raw`[+\-*/]\s*Number\([^)]*${MONEY_WORDS}[^)]*\)|Number\([^)]*${MONEY_WORDS}[^)]*\)\s*[+\-*/]`,
    "i",
  );

  for (const fullPath of getUiFiles()) {
    const normalized = relativePath(fullPath);

    findings.push(
      ...findLineFindings(normalized, (line) => {
        if (
          line.includes('from "@/lib/finance/') &&
          riskyFinanceImport.test(line) &&
          !line.includes("formatMoney") &&
          !line.includes("formatPercent") &&
          !line.includes("formatNumber")
        ) {
          return "UI file imports a finance helper that looks computational instead of presentational.";
        }
        if (reduceRegex.test(line)) {
          return "UI file appears to aggregate finance-like values with reduce + Number(...).";
        }
        if (numberMoneyRegex.test(line) && !line.includes("formatMoney(")) {
          return "UI file appears to do direct Number(...) arithmetic on finance-like values.";
        }
        return null;
      }),
    );
  }

  return createResult(
    NAME,
    findings,
    "Report-only in Batch 2: surfaces likely frontend money aggregation without failing the build.",
  );
}

if (isGuardCliEntry(import.meta.url)) {
  const result = await runCheck();
  printReport(result.name, result.findings, result.summary);
}
