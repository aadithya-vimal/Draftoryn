import React from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { ContentBlock, Section } from "../engine/types";
import { theme } from "./primitives";

export function SectionEditor({
  section,
  onChange,
}: {
  section: Section;
  onChange: (blocks: ContentBlock[]) => void;
}) {
  const update = (i: number, block: ContentBlock) => onChange(section.blocks.map((b, j) => (j === i ? block : b)));

  return (
    <View style={styles.editorWrap}>
      {section.blocks.map((b, i) => (
        <View key={i} style={styles.block}>
          {b.type === "heading" && (
            <TextInput style={styles.headingInput} value={b.text ?? ""} onChangeText={(t) => update(i, { ...b, text: t })} placeholderTextColor={theme.muted} />
          )}
          {b.type === "paragraph" && (
            <TextInput
              style={styles.paragraphInput}
              value={b.text ?? ""}
              onChangeText={(t) => update(i, { ...b, text: t })}
              multiline
              placeholderTextColor={theme.muted}
            />
          )}
          {b.type === "callout" && (
            <View style={styles.callout}>
              <TextInput style={styles.calloutInput} value={b.text ?? ""} onChangeText={(t) => update(i, { ...b, text: t })} multiline placeholderTextColor={theme.muted} />
            </View>
          )}
          {b.type === "list" && (
            <View>
              {(b.items ?? []).map((it, j) => (
                <View key={j} style={styles.listRow}>
                  <TextInput
                    style={styles.itemInput}
                    value={it}
                    onChangeText={(t) => update(i, { ...b, items: (b.items ?? []).map((x, k) => (k === j ? t : x)) })}
                    placeholderTextColor={theme.muted}
                  />
                  <TouchableOpacity onPress={() => update(i, { ...b, items: (b.items ?? []).filter((_, k) => k !== j) })}>
                    <Text style={{ color: theme.danger }}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity onPress={() => update(i, { ...b, items: [...(b.items ?? []), ""] })}>
                <Text style={{ color: theme.accent, marginVertical: 6 }}>+ Add item</Text>
              </TouchableOpacity>
            </View>
          )}
          {b.type === "table" && b.table && (
            <View>
              {b.table.rows.map((row, ri) => (
                <View key={ri} style={styles.tableRow}>
                  {row.map((cell, ci) => (
                    <TextInput
                      key={ci}
                      style={styles.cellInput}
                      value={cell}
                      onChangeText={(t) =>
                        update(i, {
                          ...b,
                          table: {
                            headers: b.table!.headers,
                            rows: b.table!.rows.map((r, k) => (k === ri ? r.map((c, m) => (m === ci ? t : c)) : r)),
                          },
                        })
                      }
                      placeholderTextColor={theme.muted}
                    />
                  ))}
                </View>
              ))}
            </View>
          )}
          {b.type === "divider" && <View style={styles.divider} />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  editorWrap: { width: "100%" },
  sectionTitle: { color: theme.text, fontSize: 18, fontWeight: "700", marginBottom: 10 },
  block: { marginBottom: 14 },
  headingInput: { color: theme.text, fontSize: 16, fontWeight: "700", borderBottomWidth: 1, borderColor: theme.border, paddingVertical: 6 },
  paragraphInput: { color: theme.text, fontSize: 15, backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 10, minHeight: 80, textAlignVertical: "top" },
  callout: { backgroundColor: theme.surface2, borderLeftWidth: 3, borderLeftColor: theme.accent, borderRadius: 6, padding: 10 },
  calloutInput: { color: theme.text, fontSize: 14, minHeight: 50, textAlignVertical: "top" },
  listRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  itemInput: { flex: 1, backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border, borderRadius: 8, color: theme.text, padding: 8, marginRight: 6 },
  tableRow: { flexDirection: "row", marginBottom: 4 },
  cellInput: { flex: 1, backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border, borderRadius: 6, color: theme.text, padding: 6, marginRight: 4, fontSize: 13 },
  divider: { height: 1, backgroundColor: theme.border, marginVertical: 6 },
});
