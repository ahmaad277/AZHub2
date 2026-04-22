import type { ExecutiveReportPayload } from "../builder";

export async function exportExecutiveReportExcel(payload: ExecutiveReportPayload) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();

  const summaryRows = [
    ["GeneratedAt", payload.generatedAt],
    ["PortfolioValue", payload.metrics.portfolioValue],
    ["TotalCash", payload.metrics.totalCash],
    ["ExpectedReturns", payload.metrics.expectedReturns],
    ["ActualReturns", payload.metrics.actualReturns],
    ["PortfolioROI", payload.metrics.portfolioROI],
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summaryRows), "Summary");

  const investmentRows = [
    ["Platform", "Name", "FaceValue", "ExpectedIRR", "Status"],
    ...payload.investments.map((inv) => [
      inv.platform?.name || "",
      inv.name,
      inv.faceValue,
      inv.expectedIrr,
      inv.status,
    ]),
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(investmentRows), "Investments");

  XLSX.writeFile(workbook, `AZ_Executive_Report_${payload.generatedAt.slice(0, 10)}.xlsx`);
}
