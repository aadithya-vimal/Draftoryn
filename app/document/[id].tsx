import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAppUser } from "../../src/auth/clerk";
import { getDefinition } from "../../src/engine/definitions/catalog";
import {
  getUserSettings,
  autofillFromProfiles,
  DEFAULT_USER_SETTINGS,
  type UserSettings,
} from "../../src/lib/userSettings";
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
  LoadingOverlay,
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
  ProgressBar,
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
  needs_review: "Needs Review",
};
const SECTION_STATUS_TONE: Record<SectionStatus, BadgeTone> = {
  generated: "ok",
  empty: "neutral",
  edited: "accent",
  missing: "danger",
  ai: "info",
  needs_review: "warn",
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
  needs_review: "warn",
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
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [sectionOffsets, setSectionOffsets] = useState<Record<string, number>>({});
  const scrollViewRef = useRef<any>(null);
  const handleScroll = useCallback((e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    const entries = Object.entries(sectionOffsets);
    if (entries.length === 0) return;
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    const found = sorted.find(([_, offset]) => offset <= y + 20);
    if (found) {
      const [id] = found;
      if (id !== selectedId) {
        setSelectedId(id);
      }
    }
  }, [sectionOffsets, selectedId]);

  useEffect(() => {
    getUserSettings().then(setUserSettings);
  }, []);
  const [busy, setBusy] = useState(false);
  const [regeneratingSectionId, setRegeneratingSectionId] = useState<string | null>(null);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [showSource, setShowSource] = useState(false);
  const [exportErr, setExportErr] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [mobileSectionsOpen, setMobileSectionsOpen] = useState(false);

  const loadedDocIdRef = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionsRef = useRef<Section[]>(sections);
  const titleRef = useRef<string>(title);
  const sourceRef = useRef<Record<string, unknown>>(source);
  const modelRef = useRef<SemanticModel | null>(model);
  const recordRef = useRef<DocumentRecord | null>(record);

  sectionsRef.current = sections;
  titleRef.current = title;
  sourceRef.current = source;
  modelRef.current = model;
  recordRef.current = record;

  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;

  // ---- Load --------------------------------------------------------------
  useEffect(() => {
    if (!user.isLoaded || !user.isSignedIn || !user.userId || !id) return;
    if (loadedDocIdRef.current === id) return; // Prevent overwriting live user edits!

    let active = true;
    getDocument(user, id).then((rec) => {
      if (!active) return;
      if (!rec) {
        setRecord(null);
        loadedDocIdRef.current = id;
        return;
      }
      setRecord(rec);
      recordRef.current = rec;
      const last = rec.versions[rec.versions.length - 1];
      if (last) {
        setSections(last.sections);
        setTitle(last.title);
        setSource(rec.source ?? {});
        setModel(last.model ?? null);
        setSelectedId(last.sections[0]?.id ?? "");
      }
      loadedDocIdRef.current = id;
    });

    return () => {
      active = false;
    };
  }, [user.isLoaded, user.isSignedIn, user.userId, id]);

  // ---- Autosave (debounced) ---------------------------------------------
  const triggerAutosave = useCallback(() => {
    if (loadedDocIdRef.current !== id) return;
    if (timer.current) clearTimeout(timer.current);
    setSaveState("saving");
    timer.current = setTimeout(async () => {
      const rec = recordRef.current;
      if (!rec || !user.userId) return;
      const updated: DocumentRecord = {
        ...rec,
        title: titleRef.current,
        updatedAt: new Date().toISOString(),
        source: sourceRef.current,
        versions: rec.versions.map((v, i) =>
          i === rec.versions.length - 1
            ? {
                ...v,
                title: titleRef.current,
                sections: sectionsRef.current,
                model: modelRef.current ?? v.model,
                source: sourceRef.current,
              }
            : v,
        ),
      };
      try {
        const saved = await saveDocumentRecord(user, updated);
        recordRef.current = saved;
        setRecord(saved);
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 600);
  }, [user, id]);

  const updateSections = useCallback((updater: (prev: Section[]) => Section[]) => {
    setSections((prev) => {
      const next = updater(prev);
      sectionsRef.current = next;
      triggerAutosave();
      return next;
    });
  }, [triggerAutosave]);

  const updateTitle = useCallback((newTitle: string) => {
    setTitle(newTitle);
    titleRef.current = newTitle;
    triggerAutosave();
  }, [triggerAutosave]);

  const updateSource = useCallback((fid: string, v: unknown) => {
    setSource((prev) => {
      const next = { ...prev, [fid]: v };
      sourceRef.current = next;
      triggerAutosave();
      return next;
    });
  }, [triggerAutosave]);

  // ---- Generation --------------------------------------------------------
  const regenerateSection = useCallback(
    async (sid: string) => {
      if (!def || !user.getToken) return;
      setRegeneratingSectionId(sid);
      try {
        const gen = await generateDocumentClient(def.id, sourceRef.current, {
          sectionId: sid,
          useAi: true,
          getToken: user.getToken,
        });
        const found = gen.sections.find((s) => s.id === sid);
        if (found) {
          updateSections((prev) =>
            prev.map((s) =>
              s.id === sid ? { ...found, hidden: s.hidden } : s,
            ),
          );
        }
        setModel(gen.model);
        modelRef.current = gen.model;
      } catch (e) {
        setExportErr(e instanceof Error ? e.message : "Regeneration failed.");
      } finally {
        setRegeneratingSectionId(null);
      }
    },
    [def, user, updateSections],
  );

  const regenerateAll = useCallback(
    async (src?: Record<string, unknown>) => {
      if (!def || !user.getToken) return;
      const useSrc = src ?? sourceRef.current;
      setBusy(true);
      try {
        const gen = await generateDocumentClient(def.id, useSrc, {
          useAi: true,
          getToken: user.getToken,
        });
        updateSections(() =>
          gen.sections.map((rs) => {
            const ex = sectionsRef.current.find((s) => s.id === rs.id);
            return ex && ex.hidden ? { ...rs, hidden: true } : rs;
          }),
        );
        updateTitle(gen.title);
        setModel(gen.model);
        modelRef.current = gen.model;
      } catch (e) {
        setExportErr(e instanceof Error ? e.message : "Regeneration failed.");
      } finally {
        setBusy(false);
      }
    },
    [def, user, updateSections, updateTitle],
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
    recordRef.current = updated;
    setVersionsOpen(false);
    if (user.userId) void saveDocumentRecord(user, updated);
  }, [record, model, title, source, sections, user]);

  const restoreVersion = useCallback((v: DocumentVersion) => {
    setTitle(v.title);
    titleRef.current = v.title;
    setSource(v.source);
    sourceRef.current = v.source;
    setModel(v.model);
    modelRef.current = v.model;
    setSections(v.sections);
    sectionsRef.current = v.sections;
    setVersionsOpen(false);
    triggerAutosave();
  }, [triggerAutosave]);

  const doExport = useCallback(
    async (format: ExportFormat) => {
      if (!def || !model) return;
      const gen: GeneratedDocument = {
        definitionId: def.id,
        title: titleRef.current,
        metadata: recordRef.current ? { id: recordRef.current.id, title: recordRef.current.title } : {},
        model: modelRef.current ?? model,
        sections: sectionsRef.current,
      };
      setExportingFormat(format);
      setExportErr("");
      try {
        await exportAndSave(gen, format);
        setExportOpen(false);
      } catch (e) {
        setExportErr(e instanceof Error ? e.message : "Export failed.");
      } finally {
        setExportingFormat(null);
      }
    },
    [def, model],
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
    if (loadedDocIdRef.current === id && !record) {
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
        <Screen title="Document">
          <LoadingOverlay message="Loading document…" subMessage="Fetching document specifications and latest outline" />
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
          <ScrollView key={i} horizontal showsHorizontalScrollIndicator={false} style={styles.tableScroll}>
            <View style={styles.docTable}>
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
          </ScrollView>
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
    const isRegeneratingThis = regeneratingSectionId === s.id;

    return (
      <TouchableOpacity
        key={s.id}
        activeOpacity={0.92}
        onPress={() => {
          setSelectedId(s.id);
          if (scrollViewRef.current && sectionOffsets[s.id] !== undefined) {
            scrollViewRef.current.scrollTo({ y: sectionOffsets[s.id], animated: true });
          }
        }}
        style={[styles.canvasSection, isSelected && styles.canvasSectionSelected]}
        onLayout={(event) => {
          const { y } = event.nativeEvent.layout;
          setSectionOffsets((prev) => ({ ...prev, [s.id]: y }));
        }}
      >
        <View style={styles.canvasSectionHead}>
          <Text style={[styles.canvasSectionTitle, isSelected && { color: theme.accent }]}>{s.title}</Text>
          {isRegeneratingThis ? (
            <View style={styles.regenInlineBadge}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={styles.regenInlineText}>Regenerating…</Text>
            </View>
          ) : (
            <SectionStatusBadge status={s.status} />
          )}
        </View>

        {isRegeneratingThis ? (
          <View style={styles.sectionLoadingBox}>
            <ActivityIndicator size="small" color={theme.accent} />
            <Text style={styles.sectionLoadingText}>Synthesizing section content with AI…</Text>
          </View>
        ) : isSelected ? (
          <SectionEditor
            section={s}
            onChange={(blocks) =>
              updateSections((prev) =>
                prev.map((p) =>
                  p.id === s.id ? { ...p, blocks, status: "edited" } : p,
                ),
              )
            }
          />
        ) : (
          <View>{s.blocks.map((b, i) => renderBlock(b, i, s.title))}</View>
        )}
        {s.blocks.length === 0 && !isSelected && !isRegeneratingThis ? (
          <Text style={styles.muted}>No content yet. Click to edit.</Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  const renderCanvas = () => (
    <ScrollView style={styles.canvasScroll} contentContainerStyle={styles.canvasScrollContent} ref={scrollViewRef} onScroll={handleScroll} scrollEventThrottle={16}>
      <View style={styles.page}>
        <View style={styles.docTitleContainer}>
          <TextInput
            style={styles.docTitleInput}
            value={title}
            onChangeText={updateTitle}
            placeholder="Untitled document"
            placeholderTextColor={theme.muted}
            accessibilityLabel="Document title"
          />
        </View>
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
  const renderNavigator = (onPick?: () => void) => {
    const visibleSecs = sections.filter((s) => !s.hidden).length;
    const readySecs = sections.filter((s) => !s.hidden && s.status !== "missing" && s.status !== "empty").length;
    const secCompletionPct = visibleSecs > 0 ? Math.round((readySecs / visibleSecs) * 100) : 100;

    return (
      <View>
        <View style={{ marginBottom: 12 }}>
          <View style={styles.navHeaderRow}>
            <Text style={styles.navHeaderTitle}>SECTIONS</Text>
            <Badge tone={secCompletionPct === 100 ? "ok" : readySecs > 0 ? "accent" : "neutral"}>
              {`${readySecs}/${visibleSecs} ready`}
            </Badge>
          </View>
          <ProgressBar value={visibleSecs > 0 ? readySecs / visibleSecs : 1} height={4} style={{ marginTop: 6 }} />
        </View>
        {sections.map((s) => {
          const isCurrent = (selectedId === s.id) || (!selectedId && selected?.id === s.id);
          return (
            <View
              key={s.id}
              style={[
                styles.navItem,
                isCurrent && styles.navItemActive,
                s.hidden && styles.navItemMuted,
              ]}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.navItemMain,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => {
                  setSelectedId(s.id);
                  onPick?.();
                }}
              >
                <Text
                  style={[
                    styles.navItemTitle,
                    isCurrent && styles.navItemTitleActive,
                    s.hidden && styles.navItemHidden,
                  ]}
                  numberOfLines={2}
                >
                  {s.title}
                </Text>
                <SectionStatusBadge status={s.status} />
              </Pressable>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  updateSections((p) => {
                    const next = s.hidden ? showSection(p, s.id) : hideSection(p, s.id);
                    return next;
                  });
                }}
                style={({ pressed }) => [
                  styles.navToggle,
                  s.hidden && { backgroundColor: theme.surface2 },
                  { opacity: pressed ? 0.5 : 1 },
                ]}
                hitSlop={8}
                accessibilityLabel={s.hidden ? `Show ${s.title}` : `Hide ${s.title}`}
              >
                <Icon
                  name={s.hidden ? "EyeOff" : "Eye"}
                  size={16}
                  color={s.hidden ? theme.muted : theme.accent}
                />
              </Pressable>
            </View>
          );
        })}
        {available.length > 0 ? (
          <Button label="Add section" variant="ghost" onPress={() => setAddOpen(true)} style={styles.navAdd} />
        ) : null}
      </View>
    );
  };

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
        disabled={busy || !selected || Boolean(regeneratingSectionId)}
        style={styles.ctxButton}
      />
      <Button
        label="Regenerate all"
        variant="secondary"
        onPress={() => regenerateAll()}
        disabled={busy || Boolean(regeneratingSectionId)}
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
          onChangeText={updateTitle}
          placeholderTextColor={theme.muted}
        />
      </View>
      {model ? <StatusBadge status="editing" /> : null}
      <View style={styles.saveStatusContainer}>
        {saveState === "saving" ? (
          <View style={styles.saveProgressRow}>
            <ActivityIndicator size="small" color={theme.accent} />
            <Text style={styles.saveStatus}>Saving…</Text>
          </View>
        ) : (
          <Text style={styles.saveStatus}>
            {saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : ""}
          </Text>
        )}
      </View>
      <View style={styles.topActions}>
        <Button
          label="Regenerate section"
          variant="secondary"
          onPress={() => selected && regenerateSection(selected.id)}
          disabled={busy || !selected || Boolean(regeneratingSectionId)}
        />
        <Button
          label="Regenerate all"
          variant="secondary"
          onPress={() => regenerateAll()}
          disabled={busy || Boolean(regeneratingSectionId)}
        />
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
          <View style={styles.centerCol}>
            {busy && !regeneratingSectionId ? (
              <LoadingOverlay message="Regenerating document…" subMessage="Synthesizing all sections with latest model parameters" />
            ) : null}
            {renderCanvas()}
          </View>
          <View style={styles.rightCol}>
            <Card style={styles.rightCard}>{renderContext()}</Card>
          </View>
        </View>

        {exportErr ? <ErrorText message={exportErr} /> : null}

        {/* Source sheet */}
        <Sheet open={showSource} onClose={() => setShowSource(false)} title="Edit source">
          <View style={styles.sheetAutofillBanner}>
            <View style={styles.sheetAutofillHeader}>
              <Text style={styles.sheetAutofillTitle}>⚡ AUTOFILL PROFILES</Text>
              <TouchableOpacity onPress={() => router.push("/(app)/settings")}>
                <Text style={styles.sheetAutofillLink}>Configure →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.sheetAutofillChips}>
              <TouchableOpacity
                style={styles.sheetAutofillBtn}
                onPress={() => {
                  const next = autofillFromProfiles(sourceRef.current, userSettings, "tester");
                  setSource(next);
                  sourceRef.current = next;
                  triggerAutosave();
                }}
              >
                <Text style={styles.sheetAutofillBtnText}>+ Tester</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sheetAutofillBtn}
                onPress={() => {
                  const next = autofillFromProfiles(sourceRef.current, userSettings, "client");
                  setSource(next);
                  sourceRef.current = next;
                  triggerAutosave();
                }}
              >
                <Text style={styles.sheetAutofillBtnText}>+ Client</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetAutofillBtn, styles.sheetAutofillBtnAccent]}
                onPress={() => {
                  const next = autofillFromProfiles(sourceRef.current, userSettings, "all");
                  setSource(next);
                  sourceRef.current = next;
                  triggerAutosave();
                }}
              >
                <Text style={styles.sheetAutofillBtnAccentText}>Autofill All</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView style={styles.sheetScroll}>
            <FieldRenderer
              fields={def?.fields ?? []}
              source={source}
              onChange={(fid, v) => updateSource(fid, v)}
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
                  updateSections((p) => addSection(p, a));
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
        <Dialog open={exportOpen} onClose={() => !exportingFormat && setExportOpen(false)} title="Export document">
          <View>
            {exportingFormat ? (
              <View style={styles.exportProgressBox}>
                <ActivityIndicator size="large" color={theme.accent} style={{ marginBottom: 12 }} />
                <Text style={styles.exportProgressTitle}>Generating {exportingFormat.toUpperCase()}…</Text>
                <Text style={styles.exportProgressSub}>Formatting typography, layout rules, and domain blocks</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.quickExportBanner}
                  onPress={() => doExport(userSettings.defaultExportFormat || "pdf")}
                >
                  <View style={styles.quickExportTextCol}>
                    <View style={styles.quickExportBadgeRow}>
                      <Text style={styles.quickExportLabel}>DEFAULT EXPORT FORMAT</Text>
                      <Badge tone="accent">{(userSettings.defaultExportFormat || "pdf").toUpperCase()}</Badge>
                    </View>
                    <Text style={styles.quickExportTitle}>Export as {(userSettings.defaultExportFormat || "pdf").toUpperCase()}</Text>
                  </View>
                  <View style={styles.quickExportBtn}>
                    <Icon name="Download" size={16} color={theme.accentForeground} />
                    <Text style={styles.quickExportBtnText}>Download</Text>
                  </View>
                </TouchableOpacity>

                {EXPORT_GROUPS.map((g) => (
                  <View key={g.label} style={styles.exportGroup}>
                    <Text style={styles.exportGroupLabel}>{g.label}</Text>
                    {g.items.map((it) => {
                      const isDefault = it.format.toLowerCase() === (userSettings.defaultExportFormat || "pdf").toLowerCase();
                      return (
                        <TouchableOpacity
                          key={it.format}
                          style={[styles.exportRow, isDefault && styles.exportRowDefault]}
                          onPress={() => doExport(it.format)}
                        >
                          <View style={styles.exportRowText}>
                            <View style={styles.exportRowTitleWrap}>
                              <Text style={styles.exportRowTitle}>{it.title}</Text>
                              {isDefault ? <Badge tone="accent">Default</Badge> : null}
                            </View>
                            <Text style={styles.muted}>{it.description}</Text>
                          </View>
                          <Icon name="Download" size={18} color={theme.accent} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </>
            )}
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
          onChangeText={updateTitle}
          placeholderTextColor={theme.muted}
        />
        {model ? <StatusBadge status="editing" /> : null}
      </View>
      <View style={styles.saveStatusContainerMobile}>
        {saveState === "saving" ? (
          <View style={styles.saveProgressRow}>
            <ActivityIndicator size="small" color={theme.accent} />
            <Text style={styles.saveStatusCenter}>Saving…</Text>
          </View>
        ) : (
          <Text style={styles.saveStatusCenter}>
            {saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : ""}
          </Text>
        )}
      </View>
      <View style={styles.mobileBar}>
        <Button label="Sections" variant="secondary" onPress={() => setMobileSectionsOpen(true)} />
        <Button label="Details" variant="secondary" onPress={() => setDetailsOpen(true)} />
        <Button label="Export" onPress={() => setExportOpen(true)} />
      </View>

      {busy && !regeneratingSectionId ? (
        <LoadingOverlay message="Regenerating document…" subMessage="Synthesizing all sections with latest model parameters" />
      ) : null}
      {renderCanvas()}

      <View style={styles.mobileActions}>
        <Button
          label="Regenerate"
          variant="secondary"
          onPress={() => (selected ? regenerateSection(selected.id) : regenerateAll())}
          disabled={busy || Boolean(regeneratingSectionId)}
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

      {/* Mobile Sections sheet */}
      <Sheet open={mobileSectionsOpen} onClose={() => setMobileSectionsOpen(false)} title="Sections & outline">
        <ScrollView style={styles.sheetScroll}>
          {renderNavigator(() => setMobileSectionsOpen(false))}
          {available.length > 0 ? (
            <View style={styles.addWrap}>
              <Text style={styles.addHead}>Add section</Text>
              {available.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={styles.addItem}
                  onPress={() => {
                    updateSections((p) => addSection(p, a));
                    setMobileSectionsOpen(false);
                  }}
                >
                  <Text style={styles.addItemTitle}>+ {a.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </ScrollView>
        <Button label="Close" variant="ghost" onPress={() => setMobileSectionsOpen(false)} />
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
            disabled={busy || Boolean(regeneratingSectionId)}
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
        <Button label="Close" variant="ghost" onPress={() => setDetailsOpen(false)} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetAutofillBanner: {
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderRadius: theme.radiusSm,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.28)",
    padding: 10,
    marginBottom: 12,
  },
  sheetAutofillHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sheetAutofillTitle: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: theme.accent,
  },
  sheetAutofillLink: {
    fontFamily: theme.font.sansMedium,
    fontSize: 11.5,
    color: theme.accent,
    textDecorationLine: "underline",
  },
  sheetAutofillChips: {
    flexDirection: "row",
    gap: 6,
  },
  sheetAutofillBtn: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  sheetAutofillBtnText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 11.5,
    color: theme.text,
  },
  sheetAutofillBtnAccent: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  sheetAutofillBtnAccentText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 11.5,
    color: theme.accentForeground,
  },

  quickExportBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderWidth: 1,
    borderColor: theme.accent,
    borderRadius: theme.radiusSm,
    padding: 14,
    marginBottom: 18,
  },
  quickExportTextCol: {
    flex: 1,
  },
  quickExportBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  quickExportLabel: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    color: theme.accent,
  },
  quickExportTitle: {
    fontFamily: theme.font.serifSemi,
    fontSize: 16,
    color: theme.text,
  },
  quickExportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.accent,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  quickExportBtnText: {
    fontFamily: theme.font.sansSemi,
    fontSize: 13,
    color: theme.accentForeground,
  },
  exportRowDefault: {
    borderColor: theme.accent,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
  },
  exportRowTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
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
    fontSize: 18,
    fontFamily: theme.font.serifSemi,
    borderBottomWidth: 1,
    borderColor: theme.border,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: theme.surface2,
    borderRadius: theme.radiusSm,
    outlineStyle: "none",
  } as any,
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
  docTitleContainer: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderColor: "transparent",
  },
  docTitleInput: {
    color: theme.text,
    fontSize: 32,
    fontFamily: theme.font.serifBold,
    lineHeight: 38,
    paddingVertical: 4,
    paddingHorizontal: 0,
    outlineStyle: "none",
  } as any,
  docMeta: { flexDirection: "row", gap: 8, marginBottom: 18 },
  canvasSection: { marginTop: 22, padding: 12, borderRadius: theme.radiusSm, borderWidth: 1, borderColor: "transparent" },
  canvasSectionSelected: { borderColor: theme.accent, backgroundColor: "rgba(59, 130, 246, 0.12)" },
  canvasSectionHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14, borderBottomWidth: 1, borderColor: theme.border, paddingBottom: 8 },
  canvasSectionTitle: { flex: 1, color: theme.text, fontSize: 20, fontFamily: theme.font.serifSemi },
  docHeading: { color: theme.text, fontFamily: theme.font.serifSemi, marginBottom: 8, marginTop: 10 },
  docHeading1: { fontSize: 22 },
  docHeading2: { fontSize: 18 },
  docParagraph: { color: theme.text, fontSize: 15, lineHeight: 23, fontFamily: theme.font.sans, marginBottom: 10 },
  docList: { marginBottom: 10 },
  docListItem: { flexDirection: "row", gap: 8, marginBottom: 4 },
  docBullet: { color: theme.accent, fontSize: 15 },
  docTable: { borderWidth: 1, borderColor: theme.border, borderRadius: theme.radiusSm, marginBottom: 12, overflow: "hidden", minWidth: 460 },
  tableScroll: { marginVertical: 8, maxWidth: "100%" },
  docTableRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: theme.border },
  docTableHeader: { backgroundColor: theme.surface2 },
  docTableCell: { flex: 1, minWidth: 100, padding: 8, fontSize: 13, fontFamily: theme.font.sans, color: theme.text, borderRightWidth: 1, borderColor: theme.border },
  docTableCellHead: { flex: 1, minWidth: 100, padding: 8, fontSize: 12, fontFamily: theme.font.sansSemi, color: theme.text, borderRightWidth: 1, borderColor: theme.border, textTransform: "uppercase", letterSpacing: 1 },
  docCallout: { borderLeftWidth: 3, borderRadius: theme.radiusSm, backgroundColor: theme.surface2, padding: 12, marginBottom: 12 },
  docDivider: { height: 1, backgroundColor: theme.border, marginVertical: 18 },

  navHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 8 },
  navHeaderTitle: { fontFamily: theme.font.monoMedium, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: theme.accent },
  navItem: { flexDirection: "row", alignItems: "center", borderRadius: theme.radiusSm, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, marginBottom: 8, overflow: "hidden" },
  navItemActive: { borderColor: theme.accent, backgroundColor: "rgba(59, 130, 246, 0.12)" },
  navItemMuted: { opacity: 0.6 },
  navItemMain: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 9, paddingHorizontal: 10, gap: 8 },
  navItemTitle: { color: theme.text, fontSize: 13, fontFamily: theme.font.sansMedium, flexShrink: 1 },
  navItemTitleActive: { color: theme.accent, fontFamily: theme.font.sansSemi },
  navItemHidden: { color: theme.muted, textDecorationLine: "line-through" },
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
  mobileTitle: {
    flex: 1,
    color: theme.text,
    fontSize: 18,
    fontFamily: theme.font.serifSemi,
    borderBottomWidth: 1,
    borderColor: theme.border,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: theme.surface2,
    borderRadius: theme.radiusSm,
    outlineStyle: "none",
  } as any,
  saveStatusCenter: { color: theme.ok, fontSize: 12, fontFamily: theme.font.monoMedium, textAlign: "right" },
  saveStatusContainer: { minWidth: 80, alignItems: "flex-end", justifyContent: "center" },
  saveStatusContainerMobile: { alignItems: "flex-end", justifyContent: "center", marginBottom: 6 },
  saveProgressRow: { flexDirection: "row", alignItems: "center", gap: 6 },

  regenInlineBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(59, 130, 246, 0.12)", paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: "rgba(59, 130, 246, 0.3)" },
  regenInlineText: { color: theme.accent, fontSize: 11, fontFamily: theme.font.monoMedium },
  sectionLoadingBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 18, backgroundColor: "rgba(59, 130, 246, 0.12)", borderRadius: theme.radiusSm, borderWidth: 1, borderColor: "rgba(59, 130, 246, 0.25)", marginVertical: 8 },
  sectionLoadingText: { color: theme.accent, fontSize: 13, fontFamily: theme.font.sansMedium },

  exportProgressBox: { alignItems: "center", justifyContent: "center", paddingVertical: 28, paddingHorizontal: 16 },
  exportProgressTitle: { color: theme.text, fontSize: 16, fontFamily: theme.font.serifSemi, marginBottom: 6 },
  exportProgressSub: { color: theme.muted, fontSize: 13, fontFamily: theme.font.sans, textAlign: "center" },

  mobileBar: { flexDirection: "row", gap: 8, marginBottom: 8 },
  mobileActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  mobileAction: { flex: 1 },
});
