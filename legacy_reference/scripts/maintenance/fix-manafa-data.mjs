import Database from "better-sqlite3";

const ACTIVE_OPPORTUNITIES = new Set([
  "0690-194751",
  "8237-969294",
  "2040-857997",
  "3866-4852",
  "2040-9358",
]);

function normalizeOpportunityName(rawName) {
  const value = String(rawName || "").trim();
  if (!value) return "";
  const withoutPrefix = value.replace(/^manafa\s+/i, "").replace(/^oid-/i, "").trim();
  const extracted = withoutPrefix.match(/(\d{3,}-\d{3,})/);
  return extracted ? extracted[1] : withoutPrefix;
}

function normalizePlatformName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff]/g, "");
}

const db = new Database("local.db");

const platforms = db.prepare("SELECT id, name FROM platforms").all();
const manafaPlatformIds = platforms
  .filter((platform) => {
    const normalized = normalizePlatformName(platform.name);
    return normalized.includes("manafa") || normalized.includes("manfaa") || normalized.includes("manfa");
  })
  .map((platform) => platform.id);

if (!manafaPlatformIds.length) {
  console.log("No Manafa-like platform found. Nothing changed.");
  process.exit(0);
}

const placeholders = manafaPlatformIds.map(() => "?").join(", ");
const fetchInvestments = db.prepare(`
  SELECT id, platform_id, name, start_date, end_date, face_value, total_expected_profit, expected_irr, status, created_at
  FROM investments
  WHERE platform_id IN (${placeholders})
`);

const updateInvestment = db.prepare(`
  UPDATE investments
  SET name = ?, status = ?
  WHERE id = ?
`);

const deleteCustomDistributions = db.prepare("DELETE FROM custom_distributions WHERE investment_id = ?");
const deleteCashflows = db.prepare("DELETE FROM cashflows WHERE investment_id = ?");
const deleteCashTransactions = db.prepare("DELETE FROM cash_transactions WHERE investment_id = ?");
const deleteInvestment = db.prepare("DELETE FROM investments WHERE id = ?");

const applyFix = db.transaction(() => {
  const beforeRows = fetchInvestments.all(...manafaPlatformIds);
  let renamedCount = 0;
  let statusChangedCount = 0;

  for (const row of beforeRows) {
    const normalizedName = normalizeOpportunityName(row.name);
    const normalizedStatus = ACTIVE_OPPORTUNITIES.has(normalizedName) ? "active" : "completed";
    if (row.name !== normalizedName || row.status !== normalizedStatus) {
      updateInvestment.run(normalizedName || row.name, normalizedStatus, row.id);
      if (row.name !== normalizedName) renamedCount += 1;
      if (row.status !== normalizedStatus) statusChangedCount += 1;
    }
  }

  const afterRows = fetchInvestments.all(...manafaPlatformIds);
  const keepByKey = new Map();
  const duplicateIds = [];

  for (const row of afterRows) {
    const key = [row.platform_id, normalizeOpportunityName(row.name)].join("|");

    const existing = keepByKey.get(key);
    if (!existing) {
      keepByKey.set(key, row);
      continue;
    }

    const existingEndDate = Number(existing.end_date || 0);
    const currentEndDate = Number(row.end_date || 0);
    const existingCreatedAt = Number(existing.created_at || 0);
    const currentCreatedAt = Number(row.created_at || 0);
    const keepCurrent =
      currentEndDate > existingEndDate ||
      (currentEndDate === existingEndDate && currentCreatedAt > existingCreatedAt) ||
      (currentCreatedAt === existingCreatedAt && String(row.id) > String(existing.id));

    if (keepCurrent) {
      duplicateIds.push(existing.id);
      keepByKey.set(key, row);
    } else {
      duplicateIds.push(row.id);
    }
  }

  for (const duplicateId of duplicateIds) {
    deleteCustomDistributions.run(duplicateId);
    deleteCashflows.run(duplicateId);
    deleteCashTransactions.run(duplicateId);
    deleteInvestment.run(duplicateId);
  }

  const finalRows = fetchInvestments.all(...manafaPlatformIds);
  const activeCount = finalRows.filter((row) => row.status === "active").length;
  const completedCount = finalRows.filter((row) => row.status === "completed").length;
  const activeFaceValue = finalRows
    .filter((row) => row.status === "active")
    .reduce((sum, row) => sum + Number(row.face_value || 0), 0);
  const completedFaceValue = finalRows
    .filter((row) => row.status === "completed")
    .reduce((sum, row) => sum + Number(row.face_value || 0), 0);
  const activeExpectedProfit = finalRows
    .filter((row) => row.status === "active")
    .reduce((sum, row) => sum + Number(row.total_expected_profit || 0), 0);
  const allExpectedProfit = finalRows.reduce((sum, row) => sum + Number(row.total_expected_profit || 0), 0);

  return {
    totalRowsBefore: beforeRows.length,
    totalRowsAfter: finalRows.length,
    renamedCount,
    statusChangedCount,
    deletedDuplicates: duplicateIds.length,
    activeCount,
    completedCount,
    activeFaceValue,
    completedFaceValue,
    activeExpectedProfit,
    allExpectedProfit,
    sampleActive: finalRows
      .filter((row) => row.status === "active")
      .slice(0, 10)
      .map((row) => row.name),
  };
});

const result = applyFix();
console.log(JSON.stringify(result, null, 2));
