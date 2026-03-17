function installPolyfills() {
  if (typeof Promise.withResolvers !== "function") {
    (Promise as any).withResolvers = function <T>() {
      let resolve!: (value: T | PromiseLike<T>) => void;
      let reject!: (reason?: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }

  if (typeof Array.prototype.at !== "function") {
    (Array.prototype as any).at = function (n: number) {
      n = Math.trunc(n) || 0;
      if (n < 0) n += this.length;
      if (n < 0 || n >= this.length) return undefined;
      return this[n];
    };
  }

  if (typeof globalThis.structuredClone !== "function") {
    // Minimal polyfill — sufficient for pdfjs-dist's internal cloning needs
    globalThis.structuredClone = ((obj: unknown) =>
      JSON.parse(JSON.stringify(obj))) as typeof structuredClone;
  }
}

export async function extractTextFromPdf(file: File): Promise<string> {
  installPolyfills();

  // Dynamic import to avoid SSR issues (pdfjs-dist requires DOM APIs like DOMMatrix)
  const pdfjsLib = await import("pdfjs-dist");

  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const textParts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Sort items by position: top-to-bottom (descending y), then left-to-right (ascending x).
    // PDF coordinate system has y=0 at bottom, so higher y = higher on page.
    // Items on the same line share similar y values (within a tolerance).
    const items = content.items
      .filter((item: any) => item.str !== undefined)
      .map((item: any) => ({
        str: item.str as string,
        hasEOL: item.hasEOL as boolean,
        x: item.transform[4] as number,
        y: item.transform[5] as number,
      }));

    // Group items into lines by y-coordinate (tolerance of 2 units for same line)
    items.sort((a, b) => {
      const yDiff = b.y - a.y; // descending y (top of page first)
      if (Math.abs(yDiff) > 2) return yDiff;
      return a.x - b.x; // ascending x (left to right)
    });

    const pageText = items
      .map((item) => item.str + (item.hasEOL ? "\n" : ""))
      .join("");
    textParts.push(pageText);
  }

  return textParts.join("\n");
}
