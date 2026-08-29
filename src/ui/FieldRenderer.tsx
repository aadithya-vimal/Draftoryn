import React, { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { FieldDef } from "../engine/types";
import { isFieldVisible } from "../engine/semantic";
import { theme } from "./primitives";
import { Icon } from "./components";

// ===========================================================================
// Validation Helpers
// ===========================================================================

export function validateEmail(email: string): boolean {
  if (!email || !email.trim()) return true;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

export function validatePhone(phone: string): boolean {
  if (!phone || !phone.trim()) return true;
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
  return /^\+?[0-9]{7,15}$/.test(cleaned);
}

export function validateDate(dateStr: string): boolean {
  if (!dateStr || !dateStr.trim()) return true;
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match || !match[1] || !match[2] || !match[3]) return false;
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  const dateObj = new Date(y, m - 1, d);
  return dateObj.getFullYear() === y && dateObj.getMonth() === m - 1 && dateObj.getDate() === d;
}

export function isEmailField(field: FieldDef): boolean {
  if (field.type === "email") return true;
  const id = field.id.toLowerCase();
  const label = (field.label || "").toLowerCase();
  return id.includes("email") || id.includes("mail") || label.includes("email");
}

export function isPhoneField(field: FieldDef): boolean {
  const id = field.id.toLowerCase();
  const label = (field.label || "").toLowerCase();
  return id.includes("phone") || id.includes("tel") || id.includes("mobile") || label.includes("phone");
}

export function isDateField(field: FieldDef): boolean {
  if (field.type === "date") return true;
  const id = field.id.toLowerCase();
  const label = (field.label || "").toLowerCase();
  return (
    id.endsWith("date") ||
    id.startsWith("date") ||
    id.includes("startdate") ||
    id.includes("enddate") ||
    id.includes("authdate") ||
    label.includes("date")
  );
}

// ===========================================================================
// Field UI Container Row
// ===========================================================================

function Row({
  label,
  required,
  error,
  children,
}: {
  label?: string;
  required?: boolean;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {required ? <Text style={styles.requiredStar}>*</Text> : null}
        </View>
      ) : null}
      {children}
      {error ? (
        <View style={styles.errorRow}>
          <Icon name="AlertCircle" size={13} color={theme.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ===========================================================================
// Interactive Date Picker Dialog
// ===========================================================================

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function DatePickerDialog({
  open,
  onClose,
  currentDate,
  onSelect,
  title = "Select Date",
}: {
  open: boolean;
  onClose: () => void;
  currentDate?: string;
  onSelect: (isoDate: string) => void;
  title?: string;
}) {
  const initialDate = useMemo(() => {
    if (currentDate && validateDate(currentDate)) {
      const parts = currentDate.split("-").map((p) => parseInt(p, 10));
      if (parts.length === 3 && parts[0] != null && parts[1] != null && parts[2] != null) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }
    }
    return new Date();
  }, [currentDate]);

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  // Generate calendar grid
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const selectDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onSelect(`${viewYear}-${mm}-${dd}`);
  };

  const selectToday = () => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    onSelect(`${today.getFullYear()}-${mm}-${dd}`);
  };

  const isCurrentSelected = (day: number) => {
    if (!currentDate) return false;
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return currentDate === `${viewYear}-${mm}-${dd}`;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === day
    );
  };

  if (!open) return null;

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.datePickerCard} onPress={(e) => e.stopPropagation?.()}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Icon name="X" size={18} color={theme.muted} />
            </TouchableOpacity>
          </View>

          {/* Month Navigation */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={prevMonth} style={styles.navArrow} accessibilityLabel="Previous month">
              <Icon name="ChevronLeft" size={18} color={theme.text} />
            </TouchableOpacity>
            <Text style={styles.monthName}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navArrow} accessibilityLabel="Next month">
              <Icon name="ChevronRight" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Weekday headers */}
          <View style={styles.weekdayRow}>
            {DAY_LABELS.map((d) => (
              <Text key={d} style={styles.weekdayText}>{d}</Text>
            ))}
          </View>

          {/* Calendar days grid */}
          <View style={styles.daysGrid}>
            {/* Empty slots for first week */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.dayCellEmpty} />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const selected = isCurrentSelected(day);
              const today = isToday(day);

              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayCell,
                    today && styles.dayCellToday,
                    selected && styles.dayCellSelected,
                  ]}
                  onPress={() => selectDay(day)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      today && styles.dayTextToday,
                      selected && styles.dayTextSelected,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Bottom helper actions */}
          <View style={styles.pickerFooter}>
            <TouchableOpacity style={styles.todayBtn} onPress={selectToday}>
              <Icon name="Clock" size={14} color={theme.accent} />
              <Text style={styles.todayBtnText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ===========================================================================
// Control Renderers
// ===========================================================================

function DateFieldControl({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [focused, setFocused] = useState(false);
  const dateStr = typeof value === "string" ? value : "";
  const isValid = validateDate(dateStr);

  const setQuickDate = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    onChange(`${y}-${m}-${day}`);
  };

  return (
    <Row
      label={field.label}
      required={field.required}
      error={dateStr && !isValid ? "Please enter a valid date in YYYY-MM-DD format" : null}
    >
      <View style={styles.dateInputRow}>
        <View style={{ flex: 1, position: "relative" }}>
          <TextInput
            style={[
              styles.input,
              styles.dateInputText,
              focused && styles.inputFocused,
              dateStr && !isValid && styles.inputError,
            ]}
            value={dateStr}
            onChangeText={onChange}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.muted}
            maxLength={10}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </View>
        <TouchableOpacity
          style={styles.calendarBtn}
          onPress={() => setShowPicker(true)}
          accessibilityRole="button"
          accessibilityLabel="Open calendar date picker"
        >
          <Icon name="Calendar" size={18} color={theme.accent} />
        </TouchableOpacity>
      </View>

      {/* Preset Quick Chips */}
      <View style={styles.datePresetsRow}>
        <TouchableOpacity style={styles.dateChip} onPress={() => setQuickDate(0)}>
          <Text style={styles.dateChipText}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateChip} onPress={() => setQuickDate(7)}>
          <Text style={styles.dateChipText}>+7d</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateChip} onPress={() => setQuickDate(14)}>
          <Text style={styles.dateChipText}>+14d</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateChip} onPress={() => setQuickDate(30)}>
          <Text style={styles.dateChipText}>+30d</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateChip} onPress={() => setQuickDate(90)}>
          <Text style={styles.dateChipText}>+90d</Text>
        </TouchableOpacity>
      </View>

      {field.description ? <Text style={styles.hint}>{field.description}</Text> : null}

      <DatePickerDialog
        open={showPicker}
        onClose={() => setShowPicker(false)}
        currentDate={dateStr}
        onSelect={(selected) => {
          onChange(selected);
          setShowPicker(false);
        }}
        title={`Select ${field.label}`}
      />
    </Row>
  );
}

function EmailFieldControl({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const emailStr = typeof value === "string" ? value : "";
  const isValid = validateEmail(emailStr);

  return (
    <Row
      label={field.label}
      required={field.required}
      error={emailStr && !isValid ? "Please enter a valid email address (e.g. name@company.com)" : null}
    >
      <View style={styles.inputWithIconWrap}>
        <TextInput
          style={[
            styles.input,
            styles.inputWithIcon,
            focused && styles.inputFocused,
            emailStr && !isValid && styles.inputError,
          ]}
          value={emailStr}
          onChangeText={onChange}
          placeholder="name@company.com"
          placeholderTextColor={theme.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <View style={styles.inputEndIcon}>
          {emailStr && isValid ? (
            <Icon name="Check" size={16} color="#3F5B43" strokeWidth={2.5} />
          ) : (
            <Icon name="Mail" size={16} color={theme.muted} />
          )}
        </View>
      </View>
      {field.description ? <Text style={styles.hint}>{field.description}</Text> : null}
    </Row>
  );
}

function PhoneFieldControl({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const phoneStr = typeof value === "string" ? value : "";
  const isValid = validatePhone(phoneStr);

  return (
    <Row
      label={field.label}
      required={field.required}
      error={phoneStr && !isValid ? "Please enter a valid phone number (e.g. +1 (555) 019-2834)" : null}
    >
      <View style={styles.inputWithIconWrap}>
        <TextInput
          style={[
            styles.input,
            styles.inputWithIcon,
            focused && styles.inputFocused,
            phoneStr && !isValid && styles.inputError,
          ]}
          value={phoneStr}
          onChangeText={onChange}
          placeholder="+1 (555) 019-2834"
          placeholderTextColor={theme.muted}
          keyboardType="phone-pad"
          autoCapitalize="none"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <View style={styles.inputEndIcon}>
          {phoneStr && isValid ? (
            <Icon name="Check" size={16} color="#3F5B43" strokeWidth={2.5} />
          ) : (
            <Icon name="Phone" size={16} color={theme.muted} />
          )}
        </View>
      </View>
      {field.description ? <Text style={styles.hint}>{field.description}</Text> : null}
    </Row>
  );
}

function StrInput({
  value,
  onChange,
  multiline,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      style={[
        styles.input,
        multiline && styles.multiline,
        focused && styles.inputFocused,
      ]}
      value={value}
      onChangeText={onChange}
      multiline={multiline}
      placeholder={placeholder}
      placeholderTextColor={theme.muted}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  if (isDateField(field)) {
    return <DateFieldControl field={field} value={value} onChange={onChange as (v: string) => void} />;
  }

  if (isEmailField(field)) {
    return <EmailFieldControl field={field} value={value} onChange={onChange as (v: string) => void} />;
  }

  if (isPhoneField(field)) {
    return <PhoneFieldControl field={field} value={value} onChange={onChange as (v: string) => void} />;
  }

  switch (field.type) {
    case "textarea":
      return (
        <Row label={field.label} required={field.required}>
          <StrInput
            value={(value as string) ?? ""}
            onChange={onChange}
            multiline
            placeholder={field.description || "Enter details…"}
          />
          {field.description ? <Text style={styles.hint}>{field.description}</Text> : null}
        </Row>
      );
    case "toggle": {
      const on = Boolean(value);
      return (
        <TouchableOpacity
          style={styles.rowBetween}
          onPress={() => onChange(!on)}
          accessibilityRole="switch"
          accessibilityState={{ checked: on }}
        >
          <View style={{ flex: 1, paddingRight: 12 }}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{field.label}</Text>
              {field.required ? <Text style={styles.requiredStar}>*</Text> : null}
            </View>
            {field.description ? <Text style={styles.hint}>{field.description}</Text> : null}
          </View>
          <View style={[styles.toggle, on && styles.toggleOn]}>
            <Text style={{ color: on ? "#fff" : theme.muted, fontSize: 12, fontFamily: theme.font.monoMedium }}>
              {on ? "YES" : "NO"}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }
    case "list":
    case "multiselect": {
      if (field.structured) {
        return (
          <StructuredList
            field={field}
            value={(value as Record<string, unknown>[]) ?? []}
            onChange={onChange}
          />
        );
      }
      const items = Array.isArray(value) ? (value as string[]) : [];
      return (
        <Row label={field.label} required={field.required}>
          {items.map((it, i) => (
            <View key={i} style={styles.listRow}>
              <StrInput
                value={it}
                onChange={(v) => onChange(items.map((x, j) => (j === i ? v : x)))}
                placeholder={`Item ${i + 1}`}
              />
              <TouchableOpacity
                onPress={() => onChange(items.filter((_, j) => j !== i))}
                style={styles.remove}
                accessibilityRole="button"
                accessibilityLabel="Remove item"
              >
                <Icon name="Trash2" size={16} color={theme.danger} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            onPress={() => onChange([...items, ""])}
            style={styles.add}
            accessibilityRole="button"
          >
            <Icon name="Plus" size={14} color={theme.accent} />
            <Text style={styles.addText}>Add item</Text>
          </TouchableOpacity>
          {field.description ? <Text style={styles.hint}>{field.description}</Text> : null}
        </Row>
      );
    }
    default:
      return (
        <Row label={field.label} required={field.required}>
          <StrInput
            value={(value as string) ?? ""}
            onChange={onChange}
            placeholder={field.description || `Enter ${field.label.toLowerCase()}…`}
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
  const update = (i: number, key: string, v: string) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, [key]: v } : r)));
  const setRows = (next: Record<string, unknown>[]) => onChange(next);

  return (
    <Row label={field.label} required={field.required}>
      {rows.map((row, i) => (
        <View key={i} style={styles.structRow}>
          <View style={styles.structHeader}>
            <Text style={styles.structIndex}>#{i + 1}</Text>
            <TouchableOpacity
              onPress={() => setRows(rows.filter((_, j) => j !== i))}
              style={styles.structRemoveBtn}
              accessibilityRole="button"
              accessibilityLabel="Remove structured row"
            >
              <Icon name="Trash2" size={14} color={theme.danger} />
            </TouchableOpacity>
          </View>
          {sub.map((s) => (
            <View key={s.id} style={styles.structItem}>
              <Text style={styles.subLabel}>{s.label}</Text>
              <StrInput
                value={(row[s.id] as string) ?? ""}
                onChange={(v) => update(i, s.id, v)}
                placeholder={`Enter ${s.label.toLowerCase()}…`}
              />
            </View>
          ))}
        </View>
      ))}
      <TouchableOpacity
        onPress={() => setRows([...rows, Object.fromEntries(sub.map((s) => [s.id, ""]))])}
        style={styles.add}
        accessibilityRole="button"
      >
        <Icon name="Plus" size={14} color={theme.accent} />
        <Text style={styles.addText}>Add {field.label.toLowerCase().replace(/s$/, "")}</Text>
      </TouchableOpacity>
    </Row>
  );
}

// ===========================================================================
// Main Component
// ===========================================================================

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
    <View style={styles.container}>
      {visible.map((f) => (
        <FieldControl
          key={f.id}
          field={f}
          value={source[f.id]}
          onChange={(v) => onChange(f.id, v)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  field: { marginBottom: 16 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  label: { color: theme.text, fontSize: 14, fontFamily: theme.font.sansMedium },
  requiredStar: { color: theme.accent, fontSize: 14, fontWeight: "bold" },
  subLabel: { color: theme.muted, fontSize: 12, fontFamily: theme.font.monoMedium, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8 },
  hint: { color: theme.muted, fontSize: 12, fontFamily: theme.font.sans, marginTop: 4, lineHeight: 16 },

  input: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    color: theme.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: theme.font.sans,
  },
  inputFocused: {
    borderColor: theme.accent,
    backgroundColor: "#FFFCF6",
  },
  inputError: {
    borderColor: theme.danger,
    backgroundColor: "#FDF4F4",
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: "top",
  },

  inputWithIconWrap: {
    position: "relative",
    justifyContent: "center",
  },
  inputWithIcon: {
    paddingRight: 38,
  },
  inputEndIcon: {
    position: "absolute",
    right: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 5,
  },
  errorText: {
    color: theme.danger,
    fontSize: 12,
    fontFamily: theme.font.sans,
  },

  dateInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateInputText: {
    fontFamily: theme.font.mono,
    letterSpacing: 1,
  },
  calendarBtn: {
    backgroundColor: "#FAF6EE",
    borderWidth: 1,
    borderColor: "rgba(184, 134, 11, 0.3)",
    borderRadius: theme.radiusSm,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  datePresetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  dateChip: {
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  dateChipText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    color: theme.muted,
  },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    padding: 12,
    marginBottom: 14,
  },
  toggle: {
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  toggleOn: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },

  listRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  remove: {
    padding: 8,
  },
  add: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#FAF6EE",
    borderWidth: 1,
    borderColor: "rgba(184, 134, 11, 0.25)",
    borderRadius: 6,
  },
  addText: {
    color: theme.accent,
    fontSize: 12,
    fontFamily: theme.font.sansMedium,
  },

  structRow: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    padding: 12,
    marginBottom: 10,
  },
  structHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderColor: theme.border,
    paddingBottom: 6,
  },
  structIndex: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    color: theme.accent,
  },
  structRemoveBtn: {
    padding: 4,
  },
  structItem: {
    marginBottom: 10,
  },

  // Modal Date Picker Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(26,26,26,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  datePickerCard: {
    backgroundColor: theme.surface,
    borderRadius: theme.radius,
    padding: 20,
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderColor: theme.border,
    ...theme.shadowMd,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  pickerTitle: {
    fontFamily: theme.font.serifSemi,
    fontSize: 16,
    color: theme.text,
  },
  closeBtn: {
    padding: 4,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  navArrow: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: theme.surface2,
  },
  monthName: {
    fontFamily: theme.font.sansSemi,
    fontSize: 14,
    color: theme.text,
  },
  weekdayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderColor: theme.border,
    paddingBottom: 6,
  },
  weekdayText: {
    width: 38,
    textAlign: "center",
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    color: theme.muted,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  dayCellEmpty: {
    width: 42,
    height: 38,
  },
  dayCell: {
    width: 42,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    marginVertical: 2,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: theme.accent,
  },
  dayCellSelected: {
    backgroundColor: theme.accent,
  },
  dayText: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    color: theme.text,
  },
  dayTextToday: {
    fontFamily: theme.font.sansSemi,
    color: theme.accent,
  },
  dayTextSelected: {
    fontFamily: theme.font.sansSemi,
    color: theme.accentForeground,
  },
  pickerFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: theme.border,
  },
  todayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: "#FAF6EE",
  },
  todayBtnText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 12,
    color: theme.accent,
  },
  doneBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  doneBtnText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 12,
    color: theme.muted,
  },
});
