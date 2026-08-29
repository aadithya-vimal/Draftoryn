import React from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import type { FieldDef } from "../engine/types";
import { isFieldVisible } from "../engine/semantic";
import { theme } from "./primitives";

function Row({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {children}
    </View>
  );
}

function StrInput({ value, onChange, multiline }: { value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <TextInput
      style={[styles.input, multiline && styles.multiline]}
      value={value}
      onChangeText={onChange}
      multiline={multiline}
      placeholderTextColor={theme.muted}
    />
  );
}

export function FieldRenderer({
  fields,
  source,
  onChange,
}: {
  fields: FieldDef[];
  source: Record<string, unknown>;
  onChange: (id: string, value: unknown) => void;
}) {
  const visible = fields.filter((f) => isFieldVisible(f, source));
  return (
    <View>
      {visible.map((f) => (
        <FieldControl key={f.id} field={f} value={source[f.id]} onChange={(v) => onChange(f.id, v)} />
      ))}
    </View>
  );
}

function FieldControl({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void }) {
  switch (field.type) {
    case "textarea":
      return (
        <Row label={field.label}>
          <StrInput value={(value as string) ?? ""} onChange={onChange} multiline />
          {field.description ? <Text style={styles.hint}>{field.description}</Text> : null}
        </Row>
      );
    case "toggle": {
      const on = Boolean(value);
      return (
        <TouchableOpacity style={styles.rowBetween} onPress={() => onChange(!on)}>
          <View>
            <Text style={styles.label}>{field.label}</Text>
            {field.description ? <Text style={styles.hint}>{field.description}</Text> : null}
          </View>
          <View style={[styles.toggle, on && styles.toggleOn]}>
            <Text style={{ color: on ? "#fff" : theme.muted, fontSize: 12 }}>{on ? "Yes" : "No"}</Text>
          </View>
        </TouchableOpacity>
      );
    }
    case "list":
    case "multiselect": {
      if (field.structured) return <StructuredList field={field} value={(value as Record<string, unknown>[]) ?? []} onChange={onChange} />;
      const items = Array.isArray(value) ? (value as string[]) : [];
      return (
        <Row label={field.label}>
          {items.map((it, i) => (
            <View key={i} style={styles.listRow}>
              <StrInput value={it} onChange={(v) => onChange(items.map((x, j) => (j === i ? v : x)))} />
              <TouchableOpacity onPress={() => onChange(items.filter((_, j) => j !== i))} style={styles.remove}>
                <Text style={{ color: theme.danger }}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => onChange([...items, ""])} style={styles.add}>
            <Text style={{ color: theme.accent }}>+ Add</Text>
          </TouchableOpacity>
          {field.description ? <Text style={styles.hint}>{field.description}</Text> : null}
        </Row>
      );
    }
    default:
      return (
        <Row label={field.label}>
          <StrInput
            value={(value as string) ?? ""}
            onChange={onChange}
          />
          {field.description ? <Text style={styles.hint}>{field.description}</Text> : null}
        </Row>
      );
  }
}

function StructuredList({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: Record<string, unknown>[] | Record<string, unknown>;
  onChange: (v: unknown) => void;
}) {
  const rows = Array.isArray(value) ? value : [];
  const sub = field.structured ?? [];
  const update = (i: number, key: string, v: string) => onChange(rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)));
  const setRows = (next: Record<string, unknown>[]) => onChange(next);
  return (
    <Row label={field.label}>
      {rows.map((row, i) => (
        <View key={i} style={styles.structRow}>
          {sub.map((s) => (
            <View key={s.id} style={styles.structItem}>
              <Text style={styles.subLabel}>{s.label}</Text>
              <StrInput value={(row[s.id] as string) ?? ""} onChange={(v) => update(i, s.id, v)} />
            </View>
          ))}
          <TouchableOpacity onPress={() => setRows(rows.filter((_, j) => j !== i))}>
            <Text style={{ color: theme.danger }}>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity
        onPress={() => setRows([...rows, Object.fromEntries(sub.map((s) => [s.id, ""]))])}
        style={styles.add}
      >
        <Text style={{ color: theme.accent }}>+ Add {field.label.toLowerCase().replace(/s$/, "")}</Text>
      </TouchableOpacity>
    </Row>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 14 },
  label: { color: theme.text, fontSize: 14, fontWeight: "600", marginBottom: 6 },
  subLabel: { color: theme.muted, fontSize: 12, marginBottom: 4 },
  hint: { color: theme.muted, fontSize: 12, marginTop: 4 },
  input: { backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border, borderRadius: 8, color: theme.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  multiline: { minHeight: 96, textAlignVertical: "top" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 12, marginBottom: 14 },
  toggle: { backgroundColor: theme.surface2, borderWidth: 1, borderColor: theme.border, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 },
  toggleOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  listRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  remove: { paddingHorizontal: 10 },
  add: { marginTop: 4 },
  structRow: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 10, padding: 10, marginBottom: 10 },
  structItem: { marginBottom: 8 },
});
