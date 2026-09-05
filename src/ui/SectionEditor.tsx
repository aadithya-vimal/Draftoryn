import React, { useState, useEffect } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { BlockTone, ContentBlock, Section } from "../engine/types";
import { theme } from "./primitives";
import { Badge, Icon } from "./components";

interface SectionEditorModalProps {
  open: boolean;
  section: Section | null;
  onClose: () => void;
  onSave: (blocks: ContentBlock[]) => void;
}

export function SectionEditorModal({
  open,
  section,
  onClose,
  onSave,
}: SectionEditorModalProps) {
  const [draftBlocks, setDraftBlocks] = useState<ContentBlock[]>([]);

  useEffect(() => {
    if (section) {
      setDraftBlocks(JSON.parse(JSON.stringify(section.blocks)));
    } else {
      setDraftBlocks([]);
    }
  }, [section, open]);

  if (!open || !section) return null;

  const updateBlock = (index: number, updated: ContentBlock) => {
    setDraftBlocks((prev) => prev.map((b, i) => (i === index ? updated : b)));
  };

  const removeBlock = (index: number) => {
    setDraftBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const addBlock = (type: ContentBlock["type"]) => {
    if (type === "paragraph") {
      setDraftBlocks((prev) => [...prev, { type: "paragraph", text: "" }]);
    } else if (type === "heading") {
      setDraftBlocks((prev) => [...prev, { type: "heading", level: 2, text: "" }]);
    } else if (type === "callout") {
      setDraftBlocks((prev) => [...prev, { type: "callout", tone: "info", text: "" }]);
    } else if (type === "list") {
      setDraftBlocks((prev) => [...prev, { type: "list", items: [""] }]);
    }
  };

  const handleSave = () => {
    onSave(draftBlocks);
    onClose();
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Text style={styles.modalKicker}>SECTION EDITOR</Text>
                <Badge tone="accent">{section.status.toUpperCase()}</Badge>
              </View>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {section.title}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Icon name="X" size={18} color={theme.muted} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content Body */}
          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            {draftBlocks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>This section has no content blocks yet.</Text>
                <Text style={styles.emptyStateSubtext}>Add a paragraph, list, or callout using the options below.</Text>
              </View>
            ) : (
              draftBlocks.map((b, i) => (
                <View key={i} style={styles.blockCard}>
                  {/* Block Header */}
                  <View style={styles.blockCardHeader}>
                    <Text style={styles.blockTypeLabel}>
                      {b.type === "heading"
                        ? `HEADING (H${b.level ?? 2})`
                        : b.type === "paragraph"
                        ? "PARAGRAPH"
                        : b.type === "callout"
                        ? `CALLOUT (${(b.tone ?? "info").toUpperCase()})`
                        : b.type === "list"
                        ? "BULLET LIST"
                        : b.type === "table"
                        ? "STRUCTURED TABLE"
                        : "BLOCK"}
                    </Text>
                    <TouchableOpacity onPress={() => removeBlock(i)} hitSlop={6} style={styles.deleteBlockBtn}>
                      <Icon name="Trash2" size={13} color={theme.danger} />
                      <Text style={styles.deleteBlockText}>Delete</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Heading Block */}
                  {b.type === "heading" && (
                    <TextInput
                      style={styles.headingInput}
                      value={b.text ?? ""}
                      onChangeText={(t) => updateBlock(i, { ...b, text: t })}
                      placeholder="Heading text…"
                      placeholderTextColor={theme.muted}
                    />
                  )}

                  {/* Paragraph Block */}
                  {b.type === "paragraph" && (
                    <TextInput
                      style={styles.paragraphInput}
                      value={b.text ?? ""}
                      onChangeText={(t) => updateBlock(i, { ...b, text: t })}
                      multiline
                      numberOfLines={4}
                      placeholder="Enter paragraph text…"
                      placeholderTextColor={theme.muted}
                    />
                  )}

                  {/* Callout Block */}
                  {b.type === "callout" && (
                    <View style={styles.calloutWrapper}>
                      <View style={styles.calloutToneRow}>
                        {(["info", "warning", "assumption"] as BlockTone[]).map((toneOption) => {
                          const isActive = (b.tone === toneOption) || (b.tone === "missing" && toneOption === "warning");
                          return (
                            <TouchableOpacity
                              key={toneOption}
                              style={[styles.toneChip, isActive && styles.toneChipActive]}
                              onPress={() => updateBlock(i, { ...b, tone: toneOption })}
                            >
                              <Text style={[styles.toneChipText, isActive && styles.toneChipTextActive]}>
                                {toneOption.toUpperCase()}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      <TextInput
                        style={styles.calloutInput}
                        value={b.text ?? ""}
                        onChangeText={(t) => {
                          const nextTone = b.tone === "missing" && t.trim() ? "info" : b.tone;
                          updateBlock(i, { ...b, tone: nextTone, text: t });
                        }}
                        multiline
                        numberOfLines={3}
                        placeholder="Enter notice, requirement, or waiver details…"
                        placeholderTextColor={theme.muted}
                      />
                    </View>
                  )}

                  {/* List Block */}
                  {b.type === "list" && (
                    <View style={styles.listWrapper}>
                      {(b.items ?? []).map((it, j) => (
                        <View key={j} style={styles.listRow}>
                          <Text style={styles.listBullet}>•</Text>
                          <TextInput
                            style={styles.itemInput}
                            value={it}
                            onChangeText={(t) =>
                              updateBlock(i, {
                                ...b,
                                items: (b.items ?? []).map((x, k) => (k === j ? t : x)),
                              })
                            }
                            placeholder="List item…"
                            placeholderTextColor={theme.muted}
                          />
                          <TouchableOpacity
                            onPress={() =>
                              updateBlock(i, {
                                ...b,
                                items: (b.items ?? []).filter((_, k) => k !== j),
                              })
                            }
                            style={styles.removeItemBtn}
                            hitSlop={6}
                          >
                            <Icon name="X" size={14} color={theme.danger} />
                          </TouchableOpacity>
                        </View>
                      ))}
                      <TouchableOpacity
                        onPress={() => updateBlock(i, { ...b, items: [...(b.items ?? []), ""] })}
                        style={styles.addItemBtn}
                      >
                        <Icon name="Plus" size={13} color={theme.accent} />
                        <Text style={styles.addItemBtnText}>Add Item</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Table Block */}
                  {b.type === "table" && b.table && (
                    <View style={styles.tableBlockWrapper}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll}>
                        <View style={styles.tableGrid}>
                          {/* Headers */}
                          <View style={styles.tableHeaderRow}>
                            {b.table.headers.map((h, ci) => (
                              <View key={ci} style={styles.tableHeadCell}>
                                <Text style={styles.tableHeadCellText}>{h}</Text>
                              </View>
                            ))}
                          </View>
                          {/* Rows */}
                          {b.table.rows.map((row, ri) => (
                            <View key={ri} style={styles.tableDataRow}>
                              {row.map((cell, ci) => (
                                <View key={ci} style={styles.tableDataCell}>
                                  <TextInput
                                    style={styles.cellInput}
                                    value={String(cell ?? "")}
                                    onChangeText={(t) =>
                                      updateBlock(i, {
                                        ...b,
                                        table: {
                                          headers: b.table!.headers,
                                          rows: b.table!.rows.map((r, k) =>
                                            k === ri ? r.map((c, m) => (m === ci ? t : c)) : r,
                                          ),
                                        },
                                      })
                                    }
                                    placeholderTextColor={theme.muted}
                                  />
                                </View>
                              ))}
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    </View>
                  )}
                </View>
              ))
            )}

            {/* Add Block Toolbar */}
            <View style={styles.addBlockToolbar}>
              <Text style={styles.addBlockLabel}>ADD CONTENT BLOCK</Text>
              <View style={styles.addBlockButtons}>
                <TouchableOpacity style={styles.addBlockChip} onPress={() => addBlock("paragraph")}>
                  <Icon name="AlignLeft" size={13} color={theme.text} />
                  <Text style={styles.addBlockChipText}>Paragraph</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addBlockChip} onPress={() => addBlock("list")}>
                  <Icon name="List" size={13} color={theme.text} />
                  <Text style={styles.addBlockChipText}>Bullet List</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addBlockChip} onPress={() => addBlock("callout")}>
                  <Icon name="AlertCircle" size={13} color={theme.text} />
                  <Text style={styles.addBlockChipText}>Callout</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addBlockChip} onPress={() => addBlock("heading")}>
                  <Icon name="Type" size={13} color={theme.text} />
                  <Text style={styles.addBlockChipText}>Heading</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Icon name="Check" size={15} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Save Section</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Retain legacy SectionEditor export if needed
export function SectionEditor({
  section,
  onChange,
}: {
  section: Section;
  onChange: (blocks: ContentBlock[]) => void;
}) {
  return null;
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(9, 10, 12, 0.82)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: "100%",
    maxWidth: 760,
    maxHeight: "88%",
    backgroundColor: theme.surface,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.borderLight,
    ...theme.shadowMd,
    overflow: "hidden",
    flexDirection: "column",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  modalKicker: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: theme.accent,
  },
  modalTitle: {
    fontFamily: theme.font.sansSemi,
    fontSize: 17,
    color: theme.text,
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
    gap: 16,
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.surface2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  emptyStateText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 14,
    color: theme.text,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontFamily: theme.font.sans,
    fontSize: 12,
    color: theme.muted,
  },
  blockCard: {
    backgroundColor: theme.surface2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
  },
  blockCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  blockTypeLabel: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10.5,
    letterSpacing: 1,
    color: theme.muted,
  },
  deleteBlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  deleteBlockText: {
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    color: theme.danger,
  },
  headingInput: {
    fontFamily: theme.font.sansSemi,
    fontSize: 15,
    color: theme.text,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  paragraphInput: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    color: theme.text,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 6,
    padding: 12,
    minHeight: 90,
    textAlignVertical: "top",
    lineHeight: 20,
  },
  calloutWrapper: {
    gap: 8,
  },
  calloutToneRow: {
    flexDirection: "row",
    gap: 6,
  },
  toneChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  toneChipActive: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  toneChipText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10,
    color: theme.muted,
  },
  toneChipTextActive: {
    color: "#FFFFFF",
  },
  calloutInput: {
    fontFamily: theme.font.sans,
    fontSize: 13.5,
    color: theme.text,
    backgroundColor: theme.surface,
    borderLeftWidth: 3,
    borderLeftColor: theme.accent,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.border,
    borderRadius: 6,
    padding: 12,
    minHeight: 70,
    textAlignVertical: "top",
  },
  listWrapper: {
    gap: 8,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  listBullet: {
    fontSize: 16,
    color: theme.muted,
  },
  itemInput: {
    flex: 1,
    fontFamily: theme.font.sans,
    fontSize: 13.5,
    color: theme.text,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  removeItemBtn: {
    padding: 6,
  },
  addItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  addItemBtnText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 12,
    color: theme.accent,
  },
  tableBlockWrapper: {
    width: "100%",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: "hidden",
    backgroundColor: theme.surface,
  },
  tableScroll: {
    maxWidth: "100%",
  },
  tableGrid: {
    minWidth: "100%",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: theme.surface2,
    borderBottomWidth: 1,
    borderColor: theme.border,
  },
  tableHeadCell: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 160,
    borderRightWidth: 1,
    borderColor: theme.border,
  },
  tableHeadCellText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    color: theme.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  tableDataRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: theme.border,
  },
  tableDataCell: {
    minWidth: 160,
    borderRightWidth: 1,
    borderColor: theme.border,
  },
  cellInput: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    color: theme.text,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addBlockToolbar: {
    marginTop: 8,
    padding: 14,
    backgroundColor: theme.surface2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  addBlockLabel: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10,
    letterSpacing: 1.2,
    color: theme.muted,
    marginBottom: 8,
  },
  addBlockButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  addBlockChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 6,
  },
  addBlockChipText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 12,
    color: theme.text,
  },
  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 6,
  },
  cancelBtnText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 13,
    color: theme.muted,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.accent,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 6,
    ...theme.shadowSm,
  },
  saveBtnText: {
    fontFamily: theme.font.sansSemi,
    fontSize: 13,
    color: "#FFFFFF",
  },
});

