/**
 * Renders PDF pages to base64-encoded PNG strings using pdfjs-dist (ESM build)
 * and @napi-rs/canvas for Node.js rasterisation.
 *
 * Requirements: 2.1
 */

import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { RenderParameters } from "pdfjs-dist/types/src/display/api";


/** DPI target and the resulting scale factor (PDF user units are at 72 DPI). */
const TARGET_DPI = 150;
const SCALE = TARGET_DPI / 72; // ≈ 2.0833

/** Maximum number of pages rendered per document. */
const MAX_PAGES = 10;

/**
 * Rasterises each page of a PDF document and returns the results as
 * base64-encoded PNG strings (no data-URI prefix).
 *
 * @param pdfBytes - Raw bytes of the PDF file.
 * @returns Array of base64 PNG strings, one per rendered page (up to 10).
 */
export async function renderPdfPages(pdfBytes: Uint8Array): Promise<string[]> {
  const loadingTask = getDocument({
  data: pdfBytes,
  verbosity: 0,
});

  const pdf = await loadingTask.promise;
  const pageCount = Math.min(pdf.numPages, MAX_PAGES);
  const results: string[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: SCALE });

    const width = Math.ceil(viewport.width);
    const height = Math.ceil(viewport.height);

    // @napi-rs/canvas provides a Node.js-compatible Canvas/CanvasRenderingContext2D.
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Render into the canvas using the legacy canvasContext path (canvas: null).
    const renderParams: RenderParameters = {
      // Passing null for canvas and providing canvasContext is the documented
      // backwards-compatible path when a custom context must be used.
      canvas: null,
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
    };

    const renderTask = page.render(renderParams);
    await renderTask.promise;

    // Export as PNG and return raw base64 (no data-URI prefix).
    const pngBuffer = canvas.toBuffer("image/png");
    const base64 = pngBuffer.toString("base64");
    results.push(base64);

    page.cleanup();
  }

  // cleanup() frees cached data (fonts, images) and is available on PDFDocumentProxy.
  await pdf.cleanup();

  return results;
}
