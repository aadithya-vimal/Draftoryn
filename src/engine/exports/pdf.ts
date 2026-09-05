import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ContentBlock, GeneratedDocument, Section } from "../types";

const INK = rgb(0.06, 0.07, 0.08);
const MUTED = rgb(0.45, 0.47, 0.50);
const LINE = rgb(0.88, 0.89, 0.91);
const ACCENT = rgb(0.184, 0.420, 1.0); // #2F6BFF Draftoryn Technical Blue
const MISSING = rgb(0.85, 0.29, 0.29); // #D94A4A Danger
const WARN = rgb(0.85, 0.60, 0.14); // #D99A24 Warning
const ASSUMPTION = rgb(0.184, 0.420, 1.0); // Technical note
const CALLOUT_BG = rgb(0.97, 0.98, 1.0);
const HEADER_BG = rgb(0.95, 0.96, 0.97);
const WATERMARK = rgb(0.184, 0.420, 1.0);

const PAGE = { w: 595.28, h: 841.89 };
const MARGIN = 56;

export async function toPdf(doc: GeneratedDocument): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const sansFont = font;
  const sansBold = bold;
  const monoFont = await pdf.embedFont(StandardFonts.Courier);

  let page: PDFPage = pdf.addPage([PAGE.w, PAGE.h]);
  let y = PAGE.h - MARGIN;

  const ensure = (needed: number) => {
    if (y - needed < MARGIN + 20) {
      page = pdf.addPage([PAGE.w, PAGE.h]);
      y = PAGE.h - MARGIN;
    }
  };

  const wrap = (text: string, f: PDFFont, size: number, maxW: number): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w;
      if (f.widthOfTextAtSize(trial, size) > maxW && line) {
        lines.push(line);
        line = w;
      } else {
        line = trial;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  };

  const text = (
    s: string,
    opts: { size?: number; font?: PDFFont; color?: typeof INK; indent?: number; gap?: number } = {},
  ) => {
    const size = opts.size ?? 10.5;
    const f = opts.font ?? font;
    const color = opts.color ?? INK;
    const indent = opts.indent ?? 0;
    const lines = wrap(s, f, size, PAGE.w - MARGIN * 2 - indent);
    for (const ln of lines) {
      ensure(size + 6);
      page.drawText(ln, { x: MARGIN + indent, y, size, font: f, color });
      y -= size + 5;
    }
    y -= opts.gap ?? 0;
  };

  // Document Title Header with Gold Rule
  text(doc.title, { size: 20, font: bold, gap: 4 });
  const meta = Object.entries(doc.metadata)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("   |   ");
  if (meta) text(meta, { size: 8.5, font: sansFont, color: MUTED, gap: 8 });

  // Header separator line
  y -= 6;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE.w - MARGIN, y }, thickness: 1.5, color: ACCENT });
  y -= 16;

  const drawBlock = (b: ContentBlock) => {
    switch (b.type) {
      case "heading": {
        const size = b.level === 1 ? 14 : b.level === 3 ? 11 : 12;
        y -= 4;
        text(b.text ?? "", { size, font: bold, gap: 6 });
        break;
      }
      case "paragraph":
        text(b.text ?? "", { gap: 6 });
        break;
      case "list":
        for (const it of b.items ?? []) {
          text(`•  ${it}`, { indent: 14, gap: 3 });
        }
        y -= 6;
        break;
      case "callout": {
        const color = b.tone === "missing" ? MISSING : b.tone === "warning" ? WARN : b.tone === "assumption" ? ASSUMPTION : ACCENT;
        const label = (b.tone ?? "info").toUpperCase();
        const inner = PAGE.w - MARGIN * 2 - 16;
        const rawContent = b.text ?? "";
        const cleanContent = rawContent.replace(new RegExp(`^\\s*(\\[)?${label}\\s*:\\s*`, "i"), "").trim() || rawContent;
        const lines = wrap(cleanContent, sansFont, 9.5, inner);
        const boxH = Math.max(lines.length * 14 + 22, 38);
        ensure(boxH + 10);
        y -= 4;
        page.drawRectangle({ x: MARGIN, y: y - boxH + 8, width: PAGE.w - MARGIN * 2, height: boxH, color: CALLOUT_BG, borderColor: color, borderWidth: 1 });
        page.drawText(label, { x: MARGIN + 8, y: y - 4, size: 9, font: sansBold, color });
        lines.forEach((ln, i) => {
          page.drawText(ln, { x: MARGIN + 8, y: y - 18 - i * 14, size: 9.5, font: sansFont, color: INK });
        });
        y -= boxH + 10;
        break;
      }
      case "table": {
        const t = b.table;
        if (!t) break;
        const cols = t.headers.length || 1;
        const colW = (PAGE.w - MARGIN * 2) / cols;
        const rows = [t.headers, ...t.rows];
        y -= 4;
        for (const r of rows) {
          const cellLines = r.map((c) => wrap(String(c ?? ""), sansFont, 9, colW - 12));
          const rowH = Math.max(...cellLines.map((l) => l.length)) * 12 + 10;
          ensure(rowH);
          let x = MARGIN;
          const isHeader = r === t.headers;
          r.forEach((c, ci) => {
            if (isHeader) page.drawRectangle({ x, y: y - rowH + 6, width: colW, height: rowH, color: HEADER_BG });
            const lines = wrap(String(c ?? ""), sansFont, 9, colW - 12);
            lines.forEach((ln, li) => {
              page.drawText(ln, { x: x + 6, y: y - 14 - li * 12, size: 9, font: isHeader ? sansBold : sansFont, color: INK });
            });
            page.drawRectangle({ x, y: y - rowH + 6, width: colW, height: rowH, borderColor: LINE, borderWidth: 0.5 });
            x += colW;
          });
          y -= rowH;
        }
        y -= 10;
        break;
      }
      case "divider":
        ensure(24);
        y -= 10;
        page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE.w - MARGIN, y }, thickness: 0.5, color: LINE });
        y -= 14;
        break;
    }
  };

  const sectionToPdf = (s: Section) => {
    ensure(40);
    y -= 12;
    text(s.title, { size: 13.5, font: bold, gap: 4 });
    y -= 8;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE.w - MARGIN, y }, thickness: 0.75, color: LINE });
    y -= 14;
    for (const b of s.blocks) drawBlock(b);
    y -= 10;
  };

  for (const s of doc.sections.filter((x) => !x.hidden)) sectionToPdf(s);

  // Subtle clean document border + small footer watermark
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    // Page border
    p.drawRectangle({
      x: 28,
      y: 24,
      width: PAGE.w - 56,
      height: PAGE.h - 48,
      borderColor: LINE,
      borderWidth: 0.75,
    });

    // Small footer watermark and page numbers
    p.drawText(`Generated with Draftoryn`, { x: 38, y: 14, size: 8, font: sansFont, color: ACCENT });
    p.drawText(`Page ${i + 1} of ${pages.length}`, { x: PAGE.w - 100, y: 14, size: 8, font: sansFont, color: MUTED });
  });

  return pdf.save();
}
