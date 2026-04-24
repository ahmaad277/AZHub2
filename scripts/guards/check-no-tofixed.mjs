import {
  createResult,
  findLineFindings,
  isGuardCliEntry,
  printReport,
  walkFiles,
} from "./_shared.mjs";

const NAME = "check-no-tofixed";

export async function runCheck() {
  const findings = [];
  const files = [
    ...walkFiles("app", [".ts", ".tsx"], {
      exclude: (relPath) =>
        relPath.startsWith("app/api/") ||
        relPath.endsWith(".test.ts") ||
        relPath.endsWith(".test.tsx"),
    }),
    ...walkFiles("components", [".ts", ".tsx"], {
      exclude: (relPath) =>
        relPath.startsWith("components/ui/") ||
        relPath.endsWith(".test.ts") ||
        relPath.endsWith(".test.tsx"),
    }),
  ];

  for (const file of files) {
    const relPath = file.replace(/\\/g, "/").split("/A.Z Hub 2/").pop() ?? file.replace(/\\/g, "/");
    findings.push(
      ...findLineFindings(relPath, (line) => {
        if (!line.includes(".toFixed(")) return null;
        return "Use of `.toFixed()` in app/components should be replaced by approved formatters.";
      }),
    );
  }

  return createResult(
    NAME,
    findings,
    "Report-only in Batch 2: flags `.toFixed()` in app/components without failing the build.",
  );
}

if (isGuardCliEntry(import.meta.url)) {
  const result = await runCheck();
  printReport(result.name, result.findings, result.summary);
}
