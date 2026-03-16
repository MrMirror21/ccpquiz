import * as pdfjsLib from "pdfjs-dist";

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export async function extractTextFromPdf(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const textParts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // IMPORTANT: Use hasEOL to preserve line breaks from the PDF.
    // Without newlines, the parser's regex patterns (which use ^ with m flag) will fail.
    const pageText = content.items
      .map((item: any) => item.str + (item.hasEOL ? "\n" : ""))
      .join("");
    textParts.push(pageText);
  }

  return textParts.join("\n");
}
