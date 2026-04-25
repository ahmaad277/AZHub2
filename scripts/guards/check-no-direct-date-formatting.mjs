import {
  createResult,
  findLineFindings,
  isGuardCliEntry,
  printReport,
  relativePath,
  walkFiles,
} from "./_shared.mjs";

const NAME = "check-no-direct-date-formatting";
const ALLOWED_FILE = "lib/finance/money.ts";
const PATTERNS = [
  "toLocaleDateString(",
  "toLocaleString(",
  "Intl.DateTimeFormat",
];

export async function runCheck() {
  const files = [
    ...walkFiles("app", [".ts", ".tsx"]),
    ...walkFiles("components", [".ts", ".tsx"]),
    ...walkFiles("lib", [".ts", ".tsx"], {
      include: (relPath) => relPath === ALLOWED_FILE,
    }),
  ];
  const findings = [];

  for (const file of files) {
    const relPath = relativePath(file);
    if (relPath === ALLOWED_FILE) continue;
    findings.push(
      ...findLineFindings(relPath, (line) => {
        const pattern = PATTERNS.find((p) => line.includes(p));
        if (!pattern) return null;
        return `Direct date formatting (${pattern}) should use formatDate() from ${ALLOWED_FILE}.`;
      }),
    );
  }

  return createResult(
    NAME,
    findings,
    "Report-only: flags direct date formatting outside the shared formatter.",
  );
}

if (isGuardCliEntry(import.meta.url)) {
  const result = await runCheck();
  printReport(result.name, result.findings, result.summary);
}
