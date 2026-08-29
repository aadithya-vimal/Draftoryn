import type { ExportFormat, GeneratedDocument } from "../types";
import { toMarkdown } from "./markdown";
import { toJson } from "./json";
import { toXml } from "./xml";
import { toYaml } from "./yaml";
import { toHtml } from "./html";
import { toPdf } from "./pdf";
import { toDocx } from "./docx";
import { buildGeneratorMeta } from "../watermark";

export { toMarkdown } from "./markdown";
export { toJson } from "./json";
export { toXml } from "./xml";
export { toYaml } from "./yaml";
export { toHtml } from "./html";
export { toPdf } from "./pdf";
export { toDocx } from "./docx";

export interface ExportResult {
  format: ExportFormat;
  filename: string;
  mimeType: string;
  data: Uint8Array | string;
}

const MIME: Record<ExportFormat, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  markdown: "text/markdown",
  json: "application/json",
  xml: "application/xml",
  yaml: "text/yaml",
  html: "text/html",
};

const EXT: Record<ExportFormat, string> = {
  pdf: "pdf",
  docx: "docx",
  markdown: "md",
  json: "json",
  xml: "xml",
  yaml: "yaml",
  html: "html",
};

export function slugifyTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "document";
}

export async function exportDocument(doc: GeneratedDocument, format: ExportFormat): Promise<ExportResult> {
  const withMeta: GeneratedDocument = doc.generator ? doc : { ...doc, generator: buildGeneratorMeta() };
  const clientPrefix = withMeta.model?.client?.name ? `${slugifyTitle(withMeta.model.client.name)}-` : "";
  const filename = `${clientPrefix}${slugifyTitle(withMeta.title)}.${EXT[format]}`;
  switch (format) {
    case "markdown":
      return { format, filename, mimeType: MIME.markdown, data: toMarkdown(withMeta) };
    case "json":
      return { format, filename, mimeType: MIME.json, data: toJson(withMeta) };
    case "xml":
      return { format, filename, mimeType: MIME.xml, data: toXml(withMeta) };
    case "yaml":
      return { format, filename, mimeType: MIME.yaml, data: toYaml(withMeta) };
    case "html":
      return { format, filename, mimeType: MIME.html, data: toHtml(withMeta) };
    case "pdf":
      return { format, filename, mimeType: MIME.pdf, data: await toPdf(withMeta) };
    case "docx":
      return { format, filename, mimeType: MIME.docx, data: await toDocx(withMeta) };
  }
}
