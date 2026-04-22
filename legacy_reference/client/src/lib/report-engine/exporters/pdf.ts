import type { ExecutiveReportPayload } from "../builder";

export async function exportExecutiveReportPdf(payload: ExecutiveReportPayload, title: string) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF();
  let y = 15;

  doc.setFontSize(16);
  doc.text(title, 14, y);
  y += 8;

  doc.setFontSize(10);
  doc.text(`Generated: ${payload.generatedAt}`, 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Portfolio Value", String(payload.metrics.portfolioValue)],
      ["Total Cash", String(payload.metrics.totalCash)],
      ["Expected Returns", String(payload.metrics.expectedReturns)],
      ["Actual Returns", String(payload.metrics.actualReturns)],
      ["Portfolio ROI", String(payload.metrics.portfolioROI)],
    ],
  });

  doc.addPage();
  autoTable(doc, {
    startY: 14,
    head: [["Platform", "Name", "Face Value", "Expected IRR", "Status"]],
    body: payload.investments.slice(0, 50).map((inv) => [
      inv.platform?.name || "",
      inv.name,
      String(inv.faceValue),
      String(inv.expectedIrr),
      inv.status,
    ]),
  });

  doc.save(`AZ_Executive_Report_${payload.generatedAt.slice(0, 10)}.pdf`);
}
