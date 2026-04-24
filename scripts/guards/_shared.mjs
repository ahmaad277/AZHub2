import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, "..", "..");

const DEFAULT_IGNORES = new Set([
  ".git",
  ".next",
  "build",
  "dist",
  "node_modules",
  "out",
]);

export function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

export function relativePath(filePath) {
  if (!path.isAbsolute(filePath)) {
    return toPosix(filePath);
  }
  return toPosix(path.relative(ROOT_DIR, filePath));
}

function normalizeFilePath(filePath) {
  return relativePath(filePath);
}

export function readText(filePath) {
  const normalizedPath = normalizeFilePath(filePath);
  const resolvedPath = path.join(ROOT_DIR, normalizedPath);
  return fs.readFileSync(resolvedPath, "utf8");
}

export function readJson(relativeFilePath) {
  return JSON.parse(readText(relativeFilePath));
}

export function walkFiles(startRelativeDir, extensions, options = {}) {
  const startDir = path.isAbsolute(startRelativeDir)
    ? startRelativeDir
    : path.join(ROOT_DIR, startRelativeDir);
  const files = [];
  const ignores = new Set([
    ...DEFAULT_IGNORES,
    ...(options.ignoreDirs ?? []),
  ]);

  function visit(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = relativePath(fullPath);
      if (entry.isDirectory()) {
        if (ignores.has(entry.name)) continue;
        visit(fullPath);
        continue;
      }
      if (!extensions.some((ext) => entry.name.endsWith(ext))) continue;
      if (options.include && !options.include(relPath)) continue;
      if (options.exclude && options.exclude(relPath)) continue;
      files.push(relPath);
    }
  }

  visit(startDir);
  return files.sort((a, b) => a.localeCompare(b));
}

export function findLineFindings(relativeFilePath, matcher) {
  const normalizedPath = normalizeFilePath(relativeFilePath);
  const source = readText(normalizedPath);
  const lines = source.split(/\r?\n/);
  const findings = [];

  lines.forEach((line, index) => {
    const message = matcher(line, index + 1, lines);
    if (!message) return;
    findings.push({
      file: normalizedPath,
      line: index + 1,
      message,
    });
  });

  return findings;
}

export function printReport(name, findings, summary = "") {
  console.log(`\n[guard] ${name}`);
  if (summary) {
    console.log(summary);
  }
  if (findings.length === 0) {
    console.log("No findings.");
    return;
  }

  console.log(`Found ${findings.length} issue(s):`);
  for (const finding of findings) {
    const location = finding.line
      ? `${finding.file}:${finding.line}`
      : finding.file;
    console.log(`- ${location} - ${finding.message}`);
  }
}

export function isGuardCliEntry(metaUrl) {
  return process.argv[1] && fileURLToPath(metaUrl) === path.resolve(process.argv[1]);
}

export function createResult(name, findings, summary = "") {
  return { name, findings, summary };
}
