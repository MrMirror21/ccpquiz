declare module "pdfjs-dist/legacy/build/pdf.worker.mjs" {
  const WorkerMessageHandler: unknown;
  export { WorkerMessageHandler };
}

declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  export * from "pdfjs-dist";
}
