// Canonical report export: the same IntelligenceReport renders to
// PDF / DOCX / Markdown / HTML / JSON / XML / YAML.

import type { ExportFormat } from "../../engine/types";
import { slugifyTitle, toDocx, toHtml, toMarkdown, toPdf } from "../../engine/exports/index";
import { reportToGeneratedDocument } from "./bridge";
import { toSemanticReport, toSemanticXml, toSemanticYaml } from "./semantic";
import type { IntelligenceReport } from "../schemas";

export interface IntelligenceExportResult {
  format: ExportFormat;
  filename: string;
  mimeType: string;
  data: Uint8Array | string;
}

export async function exportIntelligenceReport(
  report: IntelligenceReport,
  format: ExportFormat,
): Promise<IntelligenceExportResult> {
  const slug = slugifyTitle(report.engagement.assessmentName ?? report.type);
  const client = report.engagement.client ? `${slugifyTitle(report.engagement.client)}-` : "";
  switch (format) {
    case "json":
      return { format, filename: `${client}${slug}.json`, mimeType: "application/json", data: JSON.stringify(toSemanticReport(report), null, 2) };
    case "xml":
      return { format, filename: `${client}${slug}.xml`, mimeType: "application/xml", data: toSemanticXml(report) };
    case "yaml":
      return { format, filename: `${client}${slug}.yaml`, mimeType: "text/yaml", data: toSemanticYaml(report) };
    default: {
      const doc = reportToGeneratedDocument(report);
      if (format === "markdown") return { format, filename: `${client}${slug}.md`, mimeType: "text/markdown", data: toMarkdown(doc) };
      if (format === "html") return { format, filename: `${client}${slug}.html`, mimeType: "text/html", data: toHtml(doc) };
      if (format === "pdf") return { format, filename: `${client}${slug}.pdf`, mimeType: "application/pdf", data: await toPdf(doc) };
      return { format, filename: `${client}${slug}.docx`, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", data: await toDocx(doc) };
    }
  }
}
