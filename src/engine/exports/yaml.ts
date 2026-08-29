import type { GeneratedDocument } from "../types";
import { toSemanticJsonObject } from "./json";
import yaml from "js-yaml";

export function toYaml(doc: GeneratedDocument): string {
  return yaml.dump(toSemanticJsonObject(doc), { lineWidth: 120, noRefs: true });
}
