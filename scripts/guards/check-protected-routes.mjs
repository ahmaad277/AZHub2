import {
  createResult,
  isGuardCliEntry,
  printReport,
  readText,
  relativePath,
  walkFiles,
} from "./_shared.mjs";

const NAME = "check-protected-routes";

const PUBLIC_ROUTE_WHITELIST = new Set([
  "app/api/auth/login/route.ts",
  "app/api/auth/recovery/route.ts",
  "app/api/auth/session/route.ts",
  "app/api/health/route.ts",
  "app/api/share/[token]/route.ts",
]);

const REQUIRE_OWNER_REGEX = /\brequireOwner\s*\(/;
const DB_USAGE_REGEX = /\bdb\s*\./;

function getFirstMatchIndex(source, regex) {
  const match = source.match(regex);
  return match?.index ?? -1;
}

function getRouteHandlers(source) {
  const handlers = [];
  const matcher = /export\s+async\s+function\s+([A-Z]+)\s*\(/g;
  const matches = Array.from(source.matchAll(matcher));

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const method = match[1];
    const start = match.index ?? 0;
    const end = matches[i + 1]?.index ?? source.length;
    handlers.push({
      method,
      source: source.slice(start, end),
    });
  }

  return handlers;
}

export async function runCheck() {
  const findings = [];
  const routeFiles = walkFiles("app/api", [".ts"], {
    include: (relPath) => relPath.endsWith("/route.ts"),
  });

  for (const file of routeFiles) {
    const relPath = relativePath(file);
    const source = readText(relPath);
    if (PUBLIC_ROUTE_WHITELIST.has(relPath)) {
      continue;
    }

    const handlers = getRouteHandlers(source);
    for (const handler of handlers) {
      const requireOwnerIndex = getFirstMatchIndex(
        handler.source,
        REQUIRE_OWNER_REGEX,
      );
      if (requireOwnerIndex === -1) {
        findings.push({
          file: relPath,
          message: `Missing auth: ${handler.method} handler does not call \`requireOwner()\`.`,
        });
        continue;
      }

      const dbUsageIndex = getFirstMatchIndex(handler.source, DB_USAGE_REGEX);
      if (dbUsageIndex !== -1 && requireOwnerIndex > dbUsageIndex) {
        findings.push({
          file: relPath,
          message:
            `Missing auth ordering: ${handler.method} handler should call \`requireOwner()\` before obvious DB usage (\`db.\`).`,
        });
      }
    }
  }

  const shareRoutePath = "app/api/share/[token]/route.ts";
  const shareRouteSource = readText(shareRoutePath);
  if (!shareRouteSource.includes("needsReview: true")) {
    findings.push({
      file: shareRoutePath,
      message:
        "Share route issue: share-link submissions should force `needsReview: true`.",
    });
  }

  const appLayoutPath = "app/(app)/layout.tsx";
  const appLayoutSource = readText(appLayoutPath);
  if (
    !appLayoutSource.includes("getOwnerSessionState") ||
    !appLayoutSource.includes('redirect("/login")')
  ) {
    findings.push({
      file: appLayoutPath,
      message:
        "Layout issue: protected app layout no longer clearly enforces server-side owner auth redirect.",
    });
  }

  return createResult(
    NAME,
    findings,
    "Checks protected-route coverage, auth ordering, and public-route exceptions.",
  );
}

if (isGuardCliEntry(import.meta.url)) {
  const result = await runCheck();
  printReport(result.name, result.findings, result.summary);
}
