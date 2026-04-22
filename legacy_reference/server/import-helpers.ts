import { calculateDurationMonths } from "@shared/profit-calculator";

export type ImportEntityType = "investment" | "cashflow" | "cash_transaction";

export function detectMappingHints(row: Record<string, unknown> | undefined): string[] {
  if (!row) return [];
  return Object.keys(row).filter((key) => key !== "lineNumber" && key !== "raw");
}

export function parseOcrLines(lines: string[], entityType: ImportEntityType): Array<Record<string, unknown>> {
  return lines
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, index) => {
      const mapped: Record<string, string> = {};
      const keyValuePairs = line
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);

      for (const pair of keyValuePairs) {
        const [rawKey, ...rawValue] = pair.split(":");
        if (!rawKey || rawValue.length === 0) continue;
        mapped[rawKey.trim()] = rawValue.join(":").trim();
      }

      return {
        lineNumber: index + 1,
        raw: line,
        entityType,
        ...mapped,
      };
    });
}

const manafaRowPattern =
  /^(\d+(?:\.\d+)?)\s*%\s+(\d{2}\/\d{2}\/\d{4})\s+a\s+([\d,]+\.\d{2})\s+(OID-[A-Za-z0-9-]+)\s+(\d{2}\/\d{2}\/\d{4})$/i;

type ManafaSection = "active" | "closed" | "unknown";

export interface ManafaPdfParseResult {
  rows: Array<Record<string, unknown>>;
  warnings: string[];
  duplicateCandidates: string[];
  skippedLines: number;
}

function normalizeLine(line: string): string {
  return line.replace(/\u200f/g, "").replace(/\s+/g, " ").trim();
}

function parseDmyDate(value: string): Date | null {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const day = Number.parseInt(dd, 10);
  const month = Number.parseInt(mm, 10);
  const year = Number.parseInt(yyyy, 10);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function toIsoDate(parsed: Date): string {
  return parsed.toISOString().slice(0, 10);
}

function roundToMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeAmount(value: string): number {
  return Number.parseFloat(value.replace(/,/g, ""));
}

function normalizeOpportunityName(reference: string): string {
  return reference.replace(/^OID-/i, "").trim();
}

function detectManafaSection(line: string): ManafaSection | null {
  if (line.includes("اﻻﺳﺘﺜﻤﺎرات اﻟﻘﺎﺋﻤﺔ")) return "active";
  if (line.includes("اﻻﺳﺘﺜﻤﺎرات اﻟﻤﻐﻠﻘﺔ")) return "closed";
  return null;
}

function buildManafaDisplayName(baseName: string, trancheIndex: number): string {
  if (trancheIndex <= 1) return baseName;
  return `${baseName} (${trancheIndex})`;
}

/**
 * Each PDF table row becomes one investment. Same OID appearing on multiple rows
 * (re-investment in the same opportunity) becomes separate records with suffixed names.
 */
export function parseManafaPdfLines(
  lines: string[],
  options?: { platformId?: string; platformName?: string }
): ManafaPdfParseResult {
  const rows: Array<Record<string, unknown>> = [];
  const warnings: string[] = [];
  const duplicateCandidates: string[] = [];
  const duplicateKeySet = new Set<string>();
  const seenRows = new Map<string, number>();
  /** How many times we've seen this OID — used to disambiguate names, not to merge. */
  const trancheCountByReference = new Map<string, number>();
  let skippedLines = 0;
  let currentSection: ManafaSection = "unknown";

  for (const rawLine of lines) {
    const line = normalizeLine(rawLine);
    if (!line) continue;

    const detectedSection = detectManafaSection(line);
    if (detectedSection) {
      currentSection = detectedSection;
      continue;
    }

    const rowMatch = line.match(manafaRowPattern);
    if (!rowMatch) continue;

    const [, aprRaw, dueDateRaw, amountRaw, referenceRaw, bookingDateRaw] = rowMatch;
    const apr = Number.parseFloat(aprRaw);
    const faceValue = normalizeAmount(amountRaw);
    const dueDate = parseDmyDate(dueDateRaw);
    const bookingDate = parseDmyDate(bookingDateRaw);

    if (!Number.isFinite(apr) || !Number.isFinite(faceValue) || !dueDate || !bookingDate) {
      skippedLines += 1;
      continue;
    }

    const reference = referenceRaw.toUpperCase().trim();
    const durationMonths = calculateDurationMonths(bookingDate, dueDate);
    const totalExpectedProfit = roundToMoney(faceValue * (apr / 100) * (durationMonths / 12));

    const duplicateKey = [reference, faceValue.toFixed(2), toIsoDate(bookingDate), toIsoDate(dueDate)].join("|");
    const duplicateCount = seenRows.get(duplicateKey) || 0;
    seenRows.set(duplicateKey, duplicateCount + 1);
    if (duplicateCount > 0 && !duplicateKeySet.has(duplicateKey)) {
      duplicateKeySet.add(duplicateKey);
      duplicateCandidates.push(reference);
    }

    const baseName = normalizeOpportunityName(reference);
    const trancheIndex = (trancheCountByReference.get(reference) || 0) + 1;
    trancheCountByReference.set(reference, trancheIndex);
    const displayName = buildManafaDisplayName(baseName, trancheIndex);

    const status: "active" | "completed" = currentSection === "closed" ? "completed" : "active";
    const sourceSection: "active" | "closed" | "unknown" =
      currentSection === "closed" ? "closed" : currentSection === "active" ? "active" : "unknown";

    rows.push({
      entityType: "investment",
      platformId: options?.platformId || undefined,
      platformName: options?.platformName || "manfa’a",
      name: displayName,
      investmentName: displayName,
      referenceNumber: reference,
      faceValue: roundToMoney(faceValue),
      amount: roundToMoney(faceValue),
      expectedIrr: roundToMoney(apr),
      startDate: toIsoDate(bookingDate),
      endDate: toIsoDate(dueDate),
      durationMonths,
      totalExpectedProfit,
      distributionFrequency: "at_maturity",
      profitPaymentStructure: "at_maturity",
      status,
      sourceType: "pdf",
      sourceSection,
      raw: line,
      manafaTrancheIndex: trancheIndex,
    });
  }

  if (rows.length === 0) {
    warnings.push("No Manafa investment rows were detected from the provided PDF lines.");
  }
  if (skippedLines > 0) {
    warnings.push(`${skippedLines} lines were skipped due to invalid date/amount/APR format.`);
  }
  if (duplicateCandidates.length > 0) {
    warnings.push(
      `Identical table rows repeated (same OID, amount, and dates): ${duplicateCandidates.join(", ")}. Review before committing.`
    );
  }
  const unknownSectionCount = rows.filter((row) => row.sourceSection === "unknown").length;
  if (unknownSectionCount > 0) {
    warnings.push(`${unknownSectionCount} rows did not have clear active/closed section context.`);
  }

  return {
    rows,
    warnings,
    duplicateCandidates,
    skippedLines,
  };
}
