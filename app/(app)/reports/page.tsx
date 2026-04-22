"use client";

import * as React from "react";
import { FileText, FileJson, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers";

export default function ReportsPage() {
  const { t } = useApp();

  const downloadJson = async () => {
    const res = await fetch("/api/portfolio/export");
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `az-portfolio-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadXlsx = async () => {
    const XLSX = await import("xlsx");
    const res = await fetch("/api/portfolio/export");
    const data = await res.json();
    const wb = XLSX.utils.book_new();
    const addSheet = (name: string, rows: any[]) => {
      const ws = XLSX.utils.json_to_sheet(rows ?? []);
      XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
    };
    addSheet("Metrics", [data.metrics]);
    addSheet("Platforms", data.platforms);
    addSheet("Investments", data.investments);
    addSheet("Cashflows", data.cashflows);
    addSheet("CashTransactions", data.cashTransactions);
    addSheet("VisionTargets", data.visionTargets);
    XLSX.writeFile(wb, `az-portfolio-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const downloadPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const res = await fetch("/api/portfolio/export");
    const data = await res.json();

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("A.Z Finance Hub — Portfolio Report", 14, 14);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

    const m = data.metrics;
    autoTable(doc, {
      startY: 28,
      head: [["Metric", "Value"]],
      body: [
        ["NAV", m.nav],
        ["Active Principal", m.activePrincipal],
        ["Cash Balance", m.totalCashBalance],
        ["Realized Gains", m.realizedGains],
        ["Inflow 30d", m.expectedInflow30d],
        ["WAM (days)", m.wamDays],
        ["Default Rate %", m.defaultRatePercent],
        ["Active Annual Yield %", m.activeAnnualYieldPercent],
      ],
    });

    const invs = data.investments ?? [];
    if (invs.length) {
      autoTable(doc, {
        head: [["Name", "Platform", "Principal", "Expected Profit", "End Date"]],
        body: invs.map((i: any) => [
          i.name,
          i.platformId,
          i.principalAmount,
          i.expectedProfit,
          new Date(i.endDate).toLocaleDateString(),
        ]),
      });
    }
    doc.save(`az-portfolio-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <ReportCard
          title="JSON Export"
          description="Structured export for AI agents and backups."
          icon={<FileJson className="h-5 w-5" />}
          onClick={downloadJson}
          label="Download JSON"
        />
        <ReportCard
          title="Excel Export"
          description="Multi-sheet workbook: metrics, investments, cashflows, ledger."
          icon={<FileSpreadsheet className="h-5 w-5" />}
          onClick={downloadXlsx}
          label="Download XLSX"
        />
        <ReportCard
          title="PDF Report"
          description="Printable snapshot of your portfolio."
          icon={<FileText className="h-5 w-5" />}
          onClick={downloadPdf}
          label="Download PDF"
        />
      </div>
    </div>
  );
}

function ReportCard({
  title,
  description,
  icon,
  onClick,
  label,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <div className="rounded-xl border p-5">
      <div className="flex items-center gap-2 text-primary">{icon}</div>
      <div className="mt-3 text-lg font-semibold">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <Button onClick={onClick} className="mt-4 gap-2" variant="outline">
        <Download className="h-4 w-4" /> {label}
      </Button>
    </div>
  );
}
