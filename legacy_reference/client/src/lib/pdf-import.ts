let workerConfigured = false;
let pdfjsModulePromise: Promise<typeof import("pdfjs-dist")> | null = null;

function loadPdfJs() {
  if (!pdfjsModulePromise) {
    pdfjsModulePromise = import("pdfjs-dist");
  }
  return pdfjsModulePromise;
}

async function ensurePdfWorkerConfigured() {
  const { GlobalWorkerOptions } = await loadPdfJs();
  if (workerConfigured) return;
  GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  workerConfigured = true;
}

function pageContentToLines(items: Array<{ str?: string; transform?: number[] }>): string[] {
  const buckets = new Map<number, string[]>();
  for (const item of items) {
    const text = (item.str || "").trim();
    if (!text) continue;
    const y = Math.round(item.transform?.[5] ?? 0);
    const line = buckets.get(y) ?? [];
    line.push(text);
    buckets.set(y, line);
  }

  return Array.from(buckets.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, parts]) => parts.join(" ").trim())
    .filter(Boolean);
}

export async function extractTextFromPdf(file: File): Promise<{
  text: string;
  pageCount: number;
  lineCount: number;
}> {
  await ensurePdfWorkerConfigured();
  const { getDocument } = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: new Uint8Array(arrayBuffer) }).promise;

  const allLines: string[] = [];
  for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
    const page = await pdf.getPage(pageIndex);
    const content = await page.getTextContent();
    allLines.push(...pageContentToLines(content.items as Array<{ str?: string; transform?: number[] }>));
  }

  const text = allLines.join("\n").trim();
  return {
    text,
    pageCount: pdf.numPages,
    lineCount: allLines.length,
  };
}
