import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { exportDocument } from "../engine/exports";
import type { ExportFormat, GeneratedDocument } from "../engine/types";

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  // eslint-disable-next-line no-undef
  return (globalThis as unknown as { btoa?: (s: string) => string }).btoa?.(bin) ?? "";
}

export async function exportAndSave(doc: GeneratedDocument, format: ExportFormat): Promise<void> {
  const result = await exportDocument(doc, format);
  const data = result.data;

  if (Platform.OS === "web") {
    const g = globalThis as unknown as { document?: Document; URL?: { createObjectURL: (b: Blob) => string; revokeObjectURL: (u: string) => void } };
    if (!g.document || !g.URL) throw new Error("Web document APIs unavailable.");
    const blob = data instanceof Uint8Array ? new Blob([data as BlobPart], { type: result.mimeType }) : new Blob([data], { type: result.mimeType });
    const url = g.URL.createObjectURL(blob);
    const a = g.document.createElement("a");
    a.href = url;
    a.download = result.filename;
    a.click();
    g.URL.revokeObjectURL(url);
    return;
  }

  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);
  const path = `${FileSystem.cacheDirectory ?? ""}${result.filename}`;
  if (data instanceof Uint8Array) {
    await FileSystem.writeAsStringAsync(path, toBase64(bytes), { encoding: FileSystem.EncodingType.Base64 });
  } else {
    await FileSystem.writeAsStringAsync(path, data as string);
  }
  await Sharing.shareAsync(path);
}
