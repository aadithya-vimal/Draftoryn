import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAppUser } from "../../src/auth/clerk";
import { getDefinition } from "../../src/engine/definitions/catalog";
import {
  addSection,
  availableSections,
  hideSection,
  showSection,
} from "../../src/engine/sections";
import { createVersion } from "../../src/engine/serialization";
import type {
  ContentBlock,
  DocumentStatus,
  DocumentVersion,
  ExportFormat,
  GeneratedDocument,
  Section,
  SectionStatus,
  SemanticModel,
} from "../../src/engine/types";
import { getDocument, saveDocumentRecord } from "../../src/data/documents";
import { generateDocumentClient } from "../../src/data/generate";
import { exportAndSave } from "../../src/lib/download";
import type { DocumentRecord } from "../../src/repository/types";
import {
  Button,
  Card,
  ErrorText,
  Heading,
  Screen,
  SectionLabel,
  Spinner,
  theme,
} from "../../src/ui/primitives";
import {
  Badge,
  type BadgeTone,
  Dialog,
  Icon,
  Sheet,
  StatusBadge,
} from "../../src/ui/components";
import { CATEGORY_VISUALS } from "../../src/ui/categories";
import { FieldRenderer } from "../../src/ui/FieldRenderer";
import { SectionEditor } from "../../src/ui/SectionEditor";

type SaveState = "idle" | "saving" | "saved" | "error";

const SECTION_STATUS_LABEL: Record<SectionStatus, string> = {
  generated: "Generated",
  empty: "Empty",
  edited: "Edited",
  missing: "Missing",
  ai: "AI",
};
const SECTION_STATUS_TONE: Record<SectionStatus, BadgeTone> = {
  generated: "ok",
  empty: "neutral",
  edited: "accent",
  missing: "danger",
  ai: "info",
};

function SectionStatusBadge({ status }: { status: SectionStatus }) {
  return <Badge tone={SECTION_STATUS_TONE[status]}>{SECTION_STATUS_LABEL[status]}</Badge>;
}

const TONE_COLOR: Record<string, string> = {
  info: theme.accent,
  warning: theme.warn,
  missing: theme.danger,
  assumption: theme.warn,
  neutral: theme.muted,
};

const STATUS_TONE: Record<SectionStatus, "neutral" | "accent" | "ok" | "warn" | "danger" | "info"> = {
  generated: "ok",
  empty: "neutral",
  edited: "accent",
  missing: "danger",
  ai: "info",
};

const EXPORT_GROUPS: {
  label: string;
  items: { format: ExportFormat; title: string; description: string }[];
}[] = [
  {
    label: "Professional",
    items: [
      { format: "pdf", title: "PDF", description: "Shareable polished document" },
      { format: "docx", title: "DOCX", description: "Editable Word document" },
    ],
  },
  {
    label: "Developer / Text",
    items: [
      { format: "markdown", title: "Markdown", description: "Lightweight text" },
      { format: "html", title: "HTML", description: "Web page" },
    ],
  },
  {
    label: "Machine-readable",
    items: [
      { format: "json", title: "JSON", description: "Structured semantic representation" },
      { format: "xml", title: "XML", description: "Interchange format" },
      { format: "yaml", title: "YAML", description: "Config-style data" },
    ],
  },
];

export default function DocumentEditor() {
  const params = useLocalSearchParams();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
  const user = useAppUser();

  const [record, setRecord] = useState<DocumentRecord | null>(null);
  const defIdParam = typeof params.def === "string" ? params.def : Array.isArray(params.def) ? params.def[0] : "";
  const def = getDefinition(record?.definitionId || defIdParam || "");
  const [sections, setSections] = useState<Section[]>([]);
  const [title, setTitle] = useState("");
  const [source, setSource] = useState<Record<string, unknown>>({});
  const [model, setModel] = useState<SemanticModel | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [busy, setBusy] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [exportErr, setExportErr] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const loaded = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionsRef = useRef<Section[]>(sections);
  const sourceRef = useRef<Record<string, unknown>>(source);
  sectionsRef.current = sections;
  sourceRef.current = source;

  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;

  // ---- Load --------------------------------------------------------------
  useEffect(() => {
    if (!user.isLoaded || !user.isSignedIn || !user.userId || !id) return;
    getDocument(user, id).then((rec) => {
      if (!rec) {
        setRecord(null);
        loaded.current = true;
        return;
      }
      setRecord(rec);
      const last = rec.versions[rec.versions.length - 1];
      if (last) {
        setSections(last.sections);
        setTitle(last.title);
        setSource(rec.source);
        setModel(last.model);
        setSelectedId(last.sections[0]?.id ?? "");
      }
      loaded.current = true;
    });
  }, [user, id]);

  // ---- Autosave (debounced) ---------------------------------------------
  const persist = useCallback(() => {
    if (!record || !user.userId || !model) return;
    const updated: DocumentRecord = {
      ...record,
      title,
      updatedAt: new Date().toISOString(),
      versions: record.versions.map((v, i) =>
        i === record.versions.length - 1
          ? { ...v, title, sections, model, source }
          : v,
      ),
    };
    setSaveState("saving");
    saveDocumentRecord(user, updated)
      .then((saved) => {
        setRecord(saved);
        setSaveState("saved");
      })
      .catch(() => setSaveState("error"));
  }, [record, user, title, sections, model, source]);

  useEffect(() => {
    if (!loaded.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(persist, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [persist]);

  // ---- Generation --------------------------------------------------------
  const regenerateSection = useCallback(
    async (sid: string) => {
      if (!def || !user.getToken) return;
      setBusy(true);
      try {
        const gen = await generateDocumentClient(def.id, sourceRef.current, {
          sectionId: sid,
          getToken: user.getToken,
        });
        const found = gen.sections.find((s) => s.id === sid);
        if (found) {
          setSections((prev) =>
            prev.map((s) =>
              s.id === sid ? { ...found, hidden: s.hidden } : s,
            ),
          );
        }
        setModel(gen.model);
      } catch (e) {
        setExportErr(e instanceof Error ? e.message : "Regeneration failed.");
      } finally {
        setBusy(false);
      }
    },
    [def, user],
  );

  const regenerateAll = useCallback(
    async (src?: Record<string, unknown>) => {
      if (!def || !user.getToken) return;
      const useSrc = src ?? sourceRef.current;
      setBusy(true);
      try {
        const gen = await generateDocumentClient(def.id, useSrc, {
          getToken: user.getToken,
        });
        setSections(
          gen.sections.map((rs) => {
            const ex = sectionsRef.current.find((s) => s.id === rs.id);
            return ex && ex.hidden ? { ...rs, hidden: true } : rs;
          }),
        );
        setTitle(gen.title);
        setModel(gen.model);
      } catch (e) {
        setExportErr(e instanceof Error ? e.message : "Regeneration failed.");
      } finally {
        setBusy(false);
      }
    },
    [def, user],
  );

  const saveVersion = useCallback(() => {
    if (!record || !model) return;
    const next = createVersion(
      record.versions.length + 1,
      title,
      source,
      model,
      sections,
      "editing" as DocumentStatus,
      "Manual snapshot",
    );
    const updated: DocumentRecord = {
      ...record,
      versions: [...record.versions, next],
      currentVersionId: next.id,
      updatedAt: new Date().toISOString(),
    };
    setRecord(updated);
    setVersionsOpen(false);
    if (user.userId) void saveDocumentRecord(user, updated);
  }, [record, model, title, source, sections, user]);

  const restoreVersion = useCallback((v: DocumentVersion) => {
    setTitle(v.title);
    setSource(v.source);
    setModel(v.model);
    setSections(v.sections);
    setVersionsOpen(false);
  }, []);

  const doExport = useCallback(
    async (format: ExportFormat) => {
      if (!def || !model) return;
      const gen: GeneratedDocument = {
        definitionId: def.id,
        title,
        metadata: record ? { id: record.id, title: record.title } : {},
        model,
        sections,
      };
      try {
        await exportAndSave(gen, format);
        setExportOpen(false);
        setExportErr("");
      } catch (e) {
        setExportErr(e instanceof Error ? e.message : "Export failed.");
      }
    },
    [def, model, title, record, sections],
  );

  // ---- Derived -----------------------------------------------------------
  const selected = useMemo(
    () => sections.find((s) => s.id === selectedId) ?? sections[0],
    [sections, selectedId],
  );
  const visible = useMemo(() => sections.filter((s) => !s.hidden), [sections]);
  const available = useMemo(
    () => (def ? availableSections(def, sections) : []),
    [def, sections],
  );
  const category = def ? CATEGORY_VISUALS[def.category] : null;

  // ---- Loading / not found states ---------------------------------------
  if (user.isLoaded && user.isSignedIn && id) {
    if (loaded.current && !record) {
      return (
        <Screen title="Document">
          <Card>
            <Heading level={3}>Document not found</Heading>
            <Text style={styles.muted}>This document may have been deleted or is not available to you.</Text>
            <View style={styles.inlineActions}>
              <Button label="Back" onPress={() => router.back()} />
            </View>
          </Card>
        </Screen>
      );
    }
    if (!record) {
      return (
        <Screen>
          <Spinner />
        </Screen>
      );
    }
  }

  if (!def) {
    return (
      <Screen title="Document">
        <Card>
          <Heading level={3}>Document not found</Heading>
          <View style={styles.inlineActions}>
            <Button label="Back" onPress={() => router.back()} />
          </View>
        </Card>
      </Screen>
    );
  }

  // ---- Block rendering (read-only document view) ------------------------
  const renderBlock = (b: ContentBlock, i: number, sectionTitle?: string) => {
    switch (b.type) {
      case "heading": {
        // Strip duplicate headings that repeat the enclosing section title or a simple prefix/suffix
        const cleanBText = (b.text ?? "").trim().toLowerCase();
        const cleanSText = (sectionTitle ?? "").trim().toLowerCase();
        if (
          cleanBText &&
          (cleanBText === cleanSText ||
            cleanSText.startsWith(cleanBText) ||
            cleanBText.startsWith(cleanSText))
        ) {
          return null;
        }
        return (
          <Text
            key={i}
            style={[
              styles.docHeading,
              b.level === 1 ? styles.docHeading1 : b.level === 2 ? styles.docHeading2 : undefined,
            ]}
          >
            {b.text}
          </Text>
        );
      }
      case "paragraph":
        return (
          <Text key={i} style={styles.docParagraph}>
            {b.text}
          </Text>
        );
      case "list":
        return (
          <View key={i} style={styles.docList}>
            {(b.items ?? []).map((it, j) => (
              <View key={j} style={styles.docListItem}>
                <Text style={styles.docBullet}>•</Text>
                <Text style={styles.docParagraph}>{it}</Text>
              </View>
            ))}
          </View>
        );
      case "table":
        if (!b.table) return null;
        return (
          <View key={i} style={styles.docTable}>
            <View style={[styles.docTableRow, styles.docTableHeader]}>
              {b.table.headers.map((h, ci) => (
                <Text key={ci} style={styles.docTableCellHead}>
                  {h}
                </Text>
              ))}
            </View>
            {b.table.rows.map((row, ri) => (
              <View key={ri} style={styles.docTableRow}>
                {row.map((cell, ci) => (
                  <Text key={ci} style={styles.docTableCell}>
                    {cell}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        );
      case "callout": {
        const toneColor = b.tone ? TONE_COLOR[b.tone] ?? theme.muted : theme.accent;
        return (
          <View key={i} style={[styles.docCallout, { borderLeftColor: toneColor }]}>
            <Text style={[styles.docParagraph, { color: toneColor }]}>{b.text}</Text>
          </View>
        );
      }
      case "divider":
        return <View key={i} style={styles.docDivider} />;
      default:
        return null;
    }
  };

  const renderSection = (s: Section) => {
    const isSelected = selected?.id === s.id;
    return (
      <View key={s.id} style={styles.canvasSection}>
        <View style={styles.canvasSectionHead}>
          <Text style={styles.canvasSectionTitle}>{s.title}</Text>
          <SectionStatusBadge status={s.status} />
        </View>
        {isSelected ? (
          <SectionEditor
            section={s}
            onChange={(blocks) =>
              setSections((prev) =>
                prev.map((p) =>
                  p.id === s.id ? { ...p, blocks, status: "edited" } : p,
                ),
              )
            }
          />
        ) : (
          <View>{s.blocks.map((b, i) => renderBlock(b, i, s.title))}</View>
        )}
        {s.blocks.length === 0 && !isSelected ? (
          <Text style={styles.muted}>No content yet.</Text>
        ) : null}
      </View>
    );
  };

  const renderCanvas = () => (
    <ScrollView style={styles.canvasScroll} contentContainerStyle={styles.canvasScrollContent}>
      <View style={styles.page}>
        <Text style={styles.docTitle}>{title || "Untitled document"}</Text>
        {def ? (
          <View style={styles.docMeta}>
            {category ? <Badge tone="accent">{category.label}</Badge> : null}
            <StatusBadge status={(model ? "editing" : "draft") as DocumentStatus} />
          </View>
        ) : null}
        {visible.length === 0 ? (
          <Text style={styles.muted}>No visible sections. Show or add sections to begin.</Text>
        ) : (
          visible.map((s) => renderSection(s))
        )}
      </View>
    </ScrollView>
  );

  // ---- Left navigator ----------------------------------------------------
  const renderNavigator = (onPick?: () => void) => (
    <View>
      <SectionLabel>Sections</SectionLabel>
      {sections.map((s) => (
        <View key={s.id} style={[styles.navItem, selectedId === s.id && styles.navItemActive]}>
          <TouchableOpacity
            style={styles.navItemMain}
            onPress={() => {
              setSelectedId(s.id);
              onPick?.();
            }}
          >
            <Text style={[styles.navItemTitle, s.hidden && styles.navItemHidden]}>{s.title}</Text>
            <SectionStatusBadge status={s.status} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation?.();
              setSections((p) => {
                const next = s.hidden ? showSection(p, s.id) : hideSection(p, s.id);
                if (!s.hidden && selectedId === s.id) {
                  const firstVisible = next.find((x) => !x.hidden);
                  if (firstVisible) setSelectedId(firstVisible.id);
                }
                return next;
              });
            }}
            style={[styles.navToggle, s.hidden && { backgroundColor: theme.surface2 }]}
            accessibilityLabel={s.hidden ? `Show ${s.title}` : `Hide ${s.title}`}
          >
            <Icon name={s.hidden ? "EyeOff" : "Eye"} size={16} color={s.hidden ? theme.danger : theme.muted} />
          </TouchableOpacity>
        </View>
      ))}
      {available.length > 0 ? (
        <Button label="Add section" variant="ghost" onPress={() => setAddOpen(true)} style={styles.navAdd} />
      ) : null}
    </View>
  );

  // ---- Right context panel ----------------------------------------------
  const renderContext = () => (
    <View>
      <SectionLabel>Source</SectionLabel>
      <Button
        label="Edit source"
        variant="secondary"
        onPress={() => setShowSource(true)}
        style={styles.ctxButton}
      />

      <SectionLabel>AI tools</SectionLabel>
      <Button
        label="Regenerate section"
        variant="secondary"
        onPress={() => selected && regenerateSection(selected.id)}
        disabled={busy || !selected}
        style={styles.ctxButton}
      />
      <Button
        label="Regenerate all"
        variant="secondary"
        onPress={() => regenerateAll()}
        disabled={busy}
        style={styles.ctxButton}
      />

      <SectionLabel>Details</SectionLabel>
      <View style={styles.detailRow}>
        <Text style={styles.detailKey}>Category</Text>
        <Text style={styles.detailVal}>{category ? category.label : "—"}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailKey}>Status</Text>
        <StatusBadge status={(model ? "editing" : "draft") as DocumentStatus} />
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailKey}>Updated</Text>
        <Text style={styles.detailVal}>
          {record ? new Date(record.updatedAt).toLocaleString() : "—"}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.detailKey}>Type</Text>
        <Text style={styles.detailVal}>{model ? model.documentName : "—"}</Text>
      </View>

      <SectionLabel>Versions</SectionLabel>
      <Button
        label="Version history"
        variant="secondary"
        onPress={() => setVersionsOpen(true)}
        style={styles.ctxButton}
      />
    </View>
  );

  // ---- Top bar -----------------------------------------------------------
  const renderTopBar = () => (
    <View style={styles.topbar}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Icon name="ChevronLeft" size={18} color={theme.muted} />
        <Text style={styles.backText}>Documents</Text>
      </TouchableOpacity>
      <View style={styles.titleWrap}>
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholderTextColor={theme.muted}
        />
      </View>
      {model ? <StatusBadge status="editing" /> : null}
      <Text style={styles.saveStatus}>
        {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : ""}
      </Text>
      <View style={styles.topActions}>
        <Button
          label="Regenerate section"
          variant="secondary"
          onPress={() => selected && regenerateSection(selected.id)}
          disabled={busy || !selected}
        />
        <Button label="Regenerate all" variant="secondary" onPress={() => regenerateAll()} disabled={busy} />
        <Button label="Save version" variant="secondary" onPress={saveVersion} />
        <Button label="Export" onPress={() => setExportOpen(true)} />
      </View>
    </View>
  );

  // ---- Layout ------------------------------------------------------------
  if (isDesktop) {
    return (
      <View style={styles.screenWeb}>
        {renderTopBar()}
        <View style={styles.columns}>
          <View style={styles.leftCol}>
            <Card style={styles.leftCard}>{renderNavigator()}</Card>
          </View>
          <View style={styles.centerCol}>{renderCanvas()}</View>
          <View style={styles.rightCol}>
            <Card style={styles.rightCard}>{renderContext()}</Card>
          </View>
        </View>

        {exportErr ? <ErrorText message={exportErr} /> : null}

        {/* Source sheet */}
        <Sheet open={showSource} onClose={() => setShowSource(false)} title="Edit source">
          <ScrollView style={styles.sheetScroll}>
            <FieldRenderer
              fields={def?.fields ?? []}
              source={source}
              onChange={(fid, v) => setSource((s) => ({ ...s, [fid]: v }))}
            />
          </ScrollView>
          <View style={styles.sheetActions}>
            <Button
              label="Apply & regenerate"
              onPress={() => {
                setShowSource(false);
                void regenerateAll(sourceRef.current);
              }}
            />
            <Button label="Close" variant="ghost" onPress={() => setShowSource(false)} />
          </View>
        </Sheet>

        {/* Add section sheet */}
        <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Add section">
          <View>
            {available.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={styles.addItem}
                onPress={() => {
                  setSections((p) => addSection(p, a));
                  setAddOpen(false);
                }}
              >
                <Text style={styles.addItemTitle}>{a.title}</Text>
                {a.description ? <Text style={styles.muted}>{a.description}</Text> : null}
              </TouchableOpacity>
            ))}
          </View>
        </Sheet>

        {/* Versions sheet */}
        <Sheet open={versionsOpen} onClose={() => setVersionsOpen(false)} title="Version history">
          <ScrollView style={styles.sheetScroll}>
            {record?.versions
              .slice()
              .reverse()
              .map((v) => (
                <View key={v.id} style={styles.versionItem}>
                  <View style={styles.versionHead}>
                    <Text style={styles.versionTitle}>{v.title}</Text>
                    <Badge tone="neutral">v{v.versionNumber}</Badge>
                  </View>
                  <Text style={styles.muted}>
                    {new Date(v.createdAt).toLocaleString()}
                    {v.note ? ` · ${v.note}` : ""}
                  </Text>
                  <Button
                    label="Restore"
                    variant="secondary"
                    onPress={() => restoreVersion(v)}
                    style={styles.versionRestore}
                  />
                </View>
              ))}
          </ScrollView>
        </Sheet>

        {/* Export dialog */}
        <Dialog open={exportOpen} onClose={() => setExportOpen(false)} title="Export document">
          <View>
            {EXPORT_GROUPS.map((g) => (
              <View key={g.label} style={styles.exportGroup}>
                <Text style={styles.exportGroupLabel}>{g.label}</Text>
                {g.items.map((it) => (
                  <TouchableOpacity
                    key={it.format}
                    style={styles.exportRow}
                    onPress={() => doExport(it.format)}
                  >
                    <View style={styles.exportRowText}>
                      <Text style={styles.exportRowTitle}>{it.title}</Text>
                      <Text style={styles.muted}>{it.description}</Text>
                    </View>
                    <Icon name="Download" size={18} color={theme.accent} />
                  </TouchableOpacity>
                ))}
              </View>
            ))}
            {exportErr ? <ErrorText message={exportErr} /> : null}
          </View>
        </Dialog>
      </View>
    );
  }

  // ---- Mobile ------------------------------------------------------------
  return (
    <View style={styles.screenMobile}>
      <View style={styles.mobileTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="ChevronLeft" size={18} color={theme.muted} />
          <Text style={styles.backText}>Documents</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.mobileTitle}
          value={title}
          onChangeText={setTitle}
          placeholderTextColor={theme.muted}
        />
        {model ? <StatusBadge status="editing" /> : null}
      </View>
      <Text style={styles.saveStatusCenter}>
        {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : ""}
      </Text>

      <View style={styles.mobileBar}>
        <Button label="Sections" variant="secondary" onPress={() => setAddOpen(true)} />
        <Button label="Details" variant="secondary" onPress={() => setDetailsOpen(true)} />
        <Button label="Export" onPress={() => setExportOpen(true)} />
      </View>

      {renderCanvas()}

      <View style={styles.mobileActions}>
        <Button
          label="Regenerate"
          variant="secondary"
          onPress={() => (selected ? regenerateSection(selected.id) : regenerateAll())}
          disabled={busy}
          style={styles.mobileAction}
        />
        <Button
          label="Save version"
          variant="secondary"
          onPress={saveVersion}
          style={styles.mobileAction}
        />
      </View>

      {exportErr ? <ErrorText message={exportErr} /> : null}

      {/* Sections sheet */}
      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Sections & outline">
        <ScrollView style={styles.sheetScroll}>
          {renderNavigator(() => setAddOpen(false))}
          {available.length > 0 ? (
            <View style={styles.addWrap}>
              <Text style={styles.addHead}>Add section</Text>
              {available.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={styles.addItem}
                  onPress={() => {
                    setSections((p) => addSection(p, a));
                    setAddOpen(false);
                  }}
                >
                  <Text style={styles.addItemTitle}>+ {a.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </ScrollView>
        <Button label="Close" variant="ghost" onPress={() => setAddOpen(false)} />
      </Sheet>

      {/* Details sheet */}
      <Sheet open={detailsOpen} onClose={() => setDetailsOpen(false)} title="Details">
        <View>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Category</Text>
            <Text style={styles.detailVal}>{category ? category.label : "—"}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Status</Text>
            <StatusBadge status={(model ? "editing" : "draft") as DocumentStatus} />
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Updated</Text>
            <Text style={styles.detailVal}>
              {record ? new Date(record.updatedAt).toLocaleString() : "—"}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailKey}>Type</Text>
            <Text style={styles.detailVal}>{model ? model.documentName : "—"}</Text>
          </View>
          <Button
            label="Edit source"
            variant="secondary"
            onPress={() => {
              setDetailsOpen(false);
              setShowSource(true);
            }}
            style={styles.ctxButton}
          />
          <Button
            label="Regenerate all"
            variant="secondary"
            onPress={() => regenerateAll()}
            disabled={busy}
            style={styles.ctxButton}
          />
          <Button
            label="Version history"
            variant="secondary"
            onPress={() => {
              setDetailsOpen(false);
              setVersionsOpen(true);
            }}
            style={styles.ctxButton}
          />
        </View>
      </Sheet>

      {/* Source sheet */}
      <Sheet open={showSource} onClose={() => setShowSource(false)} title="Edit source">
        <ScrollView style={styles.sheetScroll}>
          <FieldRenderer
            fields={def?.fields ?? []}
            source={source}
            onChange={(fid, v) => setSource((s) => ({ ...s, [fid]: v }))}
          />
        </ScrollView>
        <View style={styles.sheetActions}>
          <Button
            label="Apply & regenerate"
            onPress={() => {
              setShowSource(false);
              void regenerateAll(sourceRef.current);
            }}
          />
          <Button label="Close" variant="ghost" onPress={() => setShowSource(false)} />
        </View>
      </Sheet>

      {/* Versions sheet */}
      <Sheet open={versionsOpen} onClose={() => setVersionsOpen(false)} title="Version history">
        <ScrollView style={styles.sheetScroll}>
          {record?.versions
            .slice()
            .reverse()
            .map((v) => (
              <View key={v.id} style={styles.versionItem}>
                <View style={styles.versionHead}>
                  <Text style={styles.versionTitle}>{v.title}</Text>
                  <Badge tone="neutral">v{v.versionNumber}</Badge>
                </View>
                <Text style={styles.muted}>
                  {new Date(v.createdAt).toLocaleString()}
                  {v.note ? ` · ${v.note}` : ""}
                </Text>
                <Button
                  label="Restore"
                  variant="secondary"
                  onPress={() => restoreVersion(v)}
                  style={styles.versionRestore}
                />
              </View>
            ))}
        </ScrollView>
      </Sheet>

      {/* Export dialog */}
      <Dialog open={exportOpen} onClose={() => setExportOpen(false)} title="Export document">
        <View>
          {EXPORT_GROUPS.map((g) => (
            <View key={g.label} style={styles.exportGroup}>
              <Text style={styles.exportGroupLabel}>{g.label}</Text>
              {g.items.map((it) => (
                <TouchableOpacity
                  key={it.format}
                  style={styles.exportRow}
                  onPress={() => doExport(it.format)}
                >
                  <View style={styles.exportRowText}>
                    <Text style={styles.exportRowTitle}>{it.title}</Text>
                    <Text style={styles.muted}>{it.description}</Text>
                  </View>
                  <Icon name="Download" size={18} color={theme.accent} />
                </TouchableOpacity>
              ))}
            </View>
          ))}
          {exportErr ? <ErrorText message={exportErr} /> : null}
        </View>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWeb: { flex: 1, backgroundColor: theme.bg, padding: 16, paddingTop: 20 },
  columns: { flexDirection: "row", gap: 16, flex: 1, maxWidth: 1280, alignSelf: "center", width: "100%" },
  leftCol: { width: 240 },
  centerCol: { flex: 1, minWidth: 0 },
  rightCol: { width: 280 },
  leftCard: { padding: 14, maxHeight: "100%" },
  rightCard: { padding: 14, maxHeight: "100%" },

  topbar: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  backText: { color: theme.muted, fontSize: 13, fontFamily: theme.font.sansMedium },
  titleWrap: { flex: 1, minWidth: 200 },
  titleInput: {
    color: theme.text,
    fontSize: 20,
    fontFamily: theme.font.serifSemi,
    borderBottomWidth: 1,
    borderColor: theme.border,
    paddingVertical: 4,
  },
  saveStatus: { color: theme.ok, fontSize: 12, fontFamily: theme.font.monoMedium, minWidth: 70, textAlign: "right" },
  topActions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },

  canvasScroll: { flex: 1 },
  canvasScrollContent: { paddingBottom: 40 },
  page: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: 32,
    ...theme.shadowSm,
  },
  docTitle: {
    color: theme.text,
    fontSize: 34,
    fontFamily: theme.font.serifBold,
    lineHeight: 40,
    marginBottom: 10,
  },
  docMeta: { flexDirection: "row", gap: 8, marginBottom: 18 },
  canvasSection: { marginTop: 22 },
  canvasSectionHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8, borderBottomWidth: 1, borderColor: theme.border, paddingBottom: 6 },
  canvasSectionTitle: { flex: 1, color: theme.text, fontSize: 20, fontFamily: theme.font.serifSemi },
  docHeading: { color: theme.text, fontFamily: theme.font.serifSemi, marginBottom: 8, marginTop: 10 },
  docHeading1: { fontSize: 22 },
  docHeading2: { fontSize: 18 },
  docParagraph: { color: theme.text, fontSize: 15, lineHeight: 23, fontFamily: theme.font.sans, marginBottom: 10 },
  docList: { marginBottom: 10 },
  docListItem: { flexDirection: "row", gap: 8, marginBottom: 4 },
  docBullet: { color: theme.accent, fontSize: 15 },
  docTable: { borderWidth: 1, borderColor: theme.border, borderRadius: theme.radiusSm, marginBottom: 12, overflow: "hidden" },
  docTableRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: theme.border },
  docTableHeader: { backgroundColor: theme.surface2 },
  docTableCell: { flex: 1, padding: 8, fontSize: 13, fontFamily: theme.font.sans, color: theme.text, borderRightWidth: 1, borderColor: theme.border },
  docTableCellHead: { flex: 1, padding: 8, fontSize: 12, fontFamily: theme.font.sansSemi, color: theme.text, borderRightWidth: 1, borderColor: theme.border, textTransform: "uppercase", letterSpacing: 1 },
  docCallout: { borderLeftWidth: 3, borderRadius: theme.radiusSm, backgroundColor: theme.surface2, padding: 12, marginBottom: 12 },
  docDivider: { height: 1, backgroundColor: theme.border, marginVertical: 12 },

  navItem: { flexDirection: "row", alignItems: "center", borderRadius: theme.radiusSm, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, marginBottom: 8, overflow: "hidden" },
  navItemActive: { borderColor: theme.accent, backgroundColor: "#FBF7EE" },
  navItemMain: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 9, paddingHorizontal: 10, gap: 8 },
  navItemTitle: { color: theme.text, fontSize: 13, fontFamily: theme.font.sansMedium, flexShrink: 1 },
  navItemHidden: { color: theme.muted, fontStyle: "italic" },
  navToggle: { paddingHorizontal: 10, paddingVertical: 9, borderLeftWidth: 1, borderColor: theme.border },
  navAdd: { marginTop: 4 },

  ctxButton: { marginBottom: 8, width: "100%" },
  detailRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  detailKey: { color: theme.muted, fontSize: 12, fontFamily: theme.font.monoMedium, letterSpacing: 1, textTransform: "uppercase" },
  detailVal: { color: theme.text, fontSize: 13, fontFamily: theme.font.sans, flexShrink: 1, textAlign: "right" },

  sheetScroll: { maxHeight: 420 },
  sheetActions: { flexDirection: "row", gap: 10, marginTop: 12 },
  addItem: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: theme.radiusSm, padding: 12, marginBottom: 8 },
  addItemTitle: { color: theme.text, fontSize: 14, fontFamily: theme.font.sansMedium },
  addWrap: { marginTop: 12 },
  addHead: { color: theme.text, fontSize: 13, fontFamily: theme.font.serifSemi, marginBottom: 8 },

  versionItem: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: theme.radiusSm, padding: 12, marginBottom: 10 },
  versionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  versionTitle: { color: theme.text, fontSize: 14, fontFamily: theme.font.serifSemi, flexShrink: 1 },
  versionRestore: { marginTop: 8, width: "100%" },

  exportGroup: { marginBottom: 16 },
  exportGroupLabel: { color: theme.accent, fontSize: 11, fontFamily: theme.font.monoMedium, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 },
  exportRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: theme.radiusSm, padding: 12, marginBottom: 8 },
  exportRowText: { flexShrink: 1 },
  exportRowTitle: { color: theme.text, fontSize: 15, fontFamily: theme.font.sansSemi },

  muted: { color: theme.muted, fontSize: 13, fontFamily: theme.font.sans },
  inlineActions: { flexDirection: "row", marginTop: 14 },

  screenMobile: { flex: 1, backgroundColor: theme.bg, padding: 12, paddingTop: 18 },
  mobileTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  mobileTitle: { flex: 1, color: theme.text, fontSize: 20, fontFamily: theme.font.serifSemi, borderBottomWidth: 1, borderColor: theme.border, paddingVertical: 4 },
  saveStatusCenter: { color: theme.ok, fontSize: 12, fontFamily: theme.font.monoMedium, textAlign: "right", marginBottom: 6 },
  mobileBar: { flexDirection: "row", gap: 8, marginBottom: 8 },
  mobileActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  mobileAction: { flex: 1 },
});
