import type { ContentBlock, GeneratedDocument, Section } from "../types";
import { toSemanticJsonObject } from "./json";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function blockToXml(b: ContentBlock, i: number): string {
  const tag = `block n="${i}" type="${b.type}"`;
  switch (b.type) {
    case "heading":
      return `<${tag} level="${b.level ?? 2}">${escapeXml(b.text ?? "")}</block>`;
    case "paragraph":
      return `<${tag}>${escapeXml(b.text ?? "")}</${tag}>`;
    case "list":
      return `<${tag}>${(b.items ?? []).map((it) => `<item>${escapeXml(it)}</item>`).join("")}</${tag}>`;
    case "table": {
      const t = b.table;
      if (!t) return `<${tag}/>`;
      const head = t.headers.map((h) => `<header>${escapeXml(h)}</header>`).join("");
      const rows = t.rows
        .map((r) => `<row>${r.map((c) => `<cell>${escapeXml(c)}</cell>`).join("")}</row>`)
        .join("");
      return `<${tag}><headers>${head}</headers><rows>${rows}</rows></${tag}>`;
    }
    case "callout":
      return `<${tag} tone="${b.tone ?? "info"}">${escapeXml(b.text ?? "")}</${tag}>`;
    case "divider":
      return `<${tag}/>`;
  }
}

function sectionToXml(s: Section): string {
  const blocks = s.blocks.map((b, i) => blockToXml(b, i)).join("");
  return `  <section id="${escapeXml(s.id)}" kind="${escapeXml(s.kind)}" status="${escapeXml(s.status)}">\n    <title>${escapeXml(s.title)}</title>\n    <content>${blocks}</content>\n  </section>`;
}

export function toXml(doc: GeneratedDocument): string {
  const obj = toSemanticJsonObject(doc);
  const sections = doc.sections
    .filter((s) => !s.hidden)
    .map(sectionToXml)
    .join("\n");
  const meta = Object.entries(obj.metadata)
    .map(([k, v]) => `    <${k}>${escapeXml(String(v))}</${k}>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
 <draftoryn_document type="${escapeXml(obj.document_type)}" category="${escapeXml(obj.category)}" generated_by="${escapeXml(obj.generated_by)}">
   <generator name="${escapeXml(obj.generator.name)}" product="${escapeXml(obj.generator.product)}" version="${escapeXml(obj.generator.version)}" generated_at="${escapeXml(obj.generator.generated_at)}"/>
   <title>${escapeXml(obj.name)}</title>
  <metadata>
${meta}
  </metadata>
  <organization>
    <client>${escapeXml(JSON.stringify(obj.organization.client ?? {}))}</client>
    <provider>${escapeXml(JSON.stringify(obj.organization.provider ?? {}))}</provider>
  </organization>
  <scope>${escapeXml(JSON.stringify(obj.scope ?? {}))}</scope>
  <constraints>${obj.constraints.map((c) => `<item>${escapeXml(c)}</item>`).join("")}</constraints>
  <findings count="${obj.findings.length}"/>
  <risks count="${obj.risks.length}"/>
  <recommendations count="${obj.recommendations.length}"/>
  <sections>
${sections}
  </sections>
</draftoryn_document>`;
}
