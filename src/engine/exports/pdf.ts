import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ContentBlock, GeneratedDocument, Section } from "../types";

const INK = rgb(0.102, 0.102, 0.102);
const MUTED = rgb(0.42, 0.42, 0.42);
const LINE = rgb(0.91, 0.894, 0.874);
const ACCENT = rgb(0.722, 0.525, 0.043);
const MISSING = rgb(0.61, 0.17, 0.17);
const WARN = rgb(0.66, 0.47, 0.1);
const ASSUMPTION = rgb(0.49, 0.23, 0.92);
const CALLOUT_BG = rgb(0.984, 0.969, 0.933);
const HEADER_BG = rgb(0.961, 0.953, 0.941);
const WATERMARK = rgb(0.722, 0.525, 0.043);

const PAGE = { w: 595.28, h: 841.89 };
const MARGIN = 56;

export async function toPdf(doc: GeneratedDocument): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sansFont = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

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
      ensure(size + 4);
      page.drawText(ln, { x: MARGIN + indent, y, size, font: f, color });
      y -= size + 4;
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
  page.drawLine({ start: { x: MARGIN, y: y + 2 }, end: { x: PAGE.w - MARGIN, y: y + 2 }, thickness: 1.5, color: ACCENT });
  y -= 14;

  const drawBlock = (b: ContentBlock) => {
    switch (b.type) {
      case "heading": {
        const size = b.level === 1 ? 14 : b.level === 3 ? 11 : 12;
        text(b.text ?? "", { size, font: bold, gap: 4 });
        break;
      }
      case "paragraph":
        text(b.text ?? "", { gap: 4 });
        break;
      case "list":
        for (const it of b.items ?? []) {
          text(`•  ${it}`, { indent: 14, gap: 2 });
        }
        y -= 4;
        break;
      case "callout": {
        const color = b.tone === "missing" ? MISSING : b.tone === "warning" ? WARN : b.tone === "assumption" ? ASSUMPTION : ACCENT;
        const label = (b.tone ?? "info").toUpperCase();
        const inner = PAGE.w - MARGIN * 2 - 16;
        const lines = wrap(`${label}: ${b.text ?? ""}`, sansFont, 9.5, inner);
        const boxH = lines.length * 14 + 10;
        ensure(boxH);
        page.drawRectangle({ x: MARGIN, y: y - boxH + 10, width: PAGE.w - MARGIN * 2, height: boxH, color: CALLOUT_BG, borderColor: color, borderWidth: 1 });
        page.drawText(label, { x: MARGIN + 8, y: y - 2, size: 9.5, font: sansBold, color });
        lines.slice(1).forEach((ln, i) => {
          page.drawText(ln, { x: MARGIN + 8, y: y - 16 - i * 14, size: 9.5, font: sansFont, color: INK });
        });
        y -= boxH + 6;
        break;
      }
      case "table": {
        const t = b.table;
        if (!t) break;
        const cols = t.headers.length || 1;
        const colW = (PAGE.w - MARGIN * 2) / cols;
        const rows = [t.headers, ...t.rows];
        for (const r of rows) {
          const cellLines = r.map((c) => wrap(String(c ?? ""), sansFont, 9, colW - 10));
          const rowH = Math.max(...cellLines.map((l) => l.length)) * 12 + 8;
          ensure(rowH);
          let x = MARGIN;
          const isHeader = r === t.headers;
          r.forEach((c, ci) => {
            if (isHeader) page.drawRectangle({ x, y: y - rowH + 6, width: colW, height: rowH, color: HEADER_BG });
            const lines = wrap(String(c ?? ""), sansFont, 9, colW - 10);
            lines.forEach((ln, li) => {
              page.drawText(ln, { x: x + 5, y: y - 12 - li * 12, size: 9, font: isHeader ? sansBold : sansFont, color: INK });
            });
            page.drawRectangle({ x, y: y - rowH + 6, width: colW, height: rowH, borderColor: LINE, borderWidth: 0.5 });
            x += colW;
          });
          y -= rowH;
        }
        y -= 6;
        break;
      }
      case "divider":
        ensure(4);
        page.drawLine({ start: { x: MARGIN, y: y + 4 }, end: { x: PAGE.w - MARGIN, y: y + 4 }, thickness: 0.5, color: LINE });
        y -= 10;
        break;
    }
  };

  const sectionToPdf = (s: Section) => {
    ensure(24);
    text(s.title, { size: 13, font: bold, gap: 4 });
    page.drawLine({ start: { x: MARGIN, y: y + 2 }, end: { x: PAGE.w - MARGIN, y: y + 2 }, thickness: 0.5, color: LINE });
    y -= 6;
    for (const b of s.blocks) drawBlock(b);
    y -= 8;
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
