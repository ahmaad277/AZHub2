import {
  createResult,
  findLineFindings,
  isGuardCliEntry,
  printReport,
  relativePath,
  walkFiles,
} from "./_shared.mjs";

const NAME = "check-no-hardcoded-ui-strings";

const JSX_TEXT = />\s*([A-Z][A-Za-z][^<{}`]{1,80})\s*</g;
const USER_MESSAGE_CALL =
  /\b(?:toast\.(?:success|error|message)|confirm|prompt)\(\s*["']([A-Z][^"']{2,})["']/g;
const USER_PROP =
  /\b(?:placeholder|title|aria-label)\s*=\s*["']([A-Z][^"']{2,})["']/g;

const SAFE_TEXT = [
  /^[A-Z]{2,5}$/,
  /^v?\d/,
  /^[A-Z][a-z]+ #[0-9]+$/,
  /^RESET$/,
  /^AZ$/,
];

function isSafeText(value) {
  const text = value.trim();
  if (!/[A-Za-z]/.test(text)) return true;
  if (SAFE_TEXT.some((re) => re.test(text))) return true;
  if (text.includes("{") || text.includes("}")) return true;
  if (text.includes("t(")) return true;
  if (/^[a-z_]+$/.test(text)) return true;
  return false;
}

function scanLine(line) {
  const findings = [];
  if (
    line.includes("className=") ||
    line.includes("queryKey:") ||
    line.includes("href=") ||
    line.includes("value=") ||
    line.includes("=>") ||
    line.includes("import ") ||
    line.includes("from ")
  ) {
    return findings;
  }

  for (const regex of [JSX_TEXT, USER_MESSAGE_CALL, USER_PROP]) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(line))) {
      const text = match[1]?.trim();
      if (!text || isSafeText(text)) continue;
      findings.push(`Hardcoded user-facing English string: "${text}". Use t("...").`);
    }
  }
  return findings;
}

export async function runCheck() {
  const files = [
    ...walkFiles("app/(app)", [".tsx", ".ts"], {
      exclude: (relPath) =>
        relPath.endsWith(".test.ts") ||
        relPath.endsWith(".test.tsx") ||
        relPath.includes("__tests__"),
    }),
    ...walkFiles("components", [".tsx", ".ts"], {
      exclude: (relPath) =>
        relPath.startsWith("components/ui/") ||
        relPath.endsWith(".test.ts") ||
        relPath.endsWith(".test.tsx") ||
        relPath.includes("__tests__"),
    }),
  ];
  const findings = [];

  for (const file of files) {
    const relPath = relativePath(file);
    findings.push(
      ...findLineFindings(relPath, (line) => {
        const messages = scanLine(line);
        return messages.length ? messages.join(" ") : null;
      }),
    );
  }

  return createResult(
    NAME,
    findings,
    "Report-only: flags likely hardcoded user-facing English strings in app UI.",
  );
}

if (isGuardCliEntry(import.meta.url)) {
  const result = await runCheck();
  printReport(result.name, result.findings, result.summary);
}
