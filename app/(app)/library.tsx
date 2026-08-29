import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useAppUser } from "../../src/auth/clerk";
import { listDocuments, deleteDocument } from "../../src/data/documents";
import { CATEGORY_VISUALS } from "../../src/ui/categories";
import type { DocumentCategory, DocumentStatus } from "../../src/engine/types";
import type { DocumentSummary } from "../../src/repository/types";
import {
  Button,
  Card,
  EmptyState,
  ErrorText,
  Heading,
  Input,
  SectionLabel,
  theme,
} from "../../src/ui/primitives";
import {
  Icon,
  Skeleton,
  PageIllustration,
  SegmentedControl,
  StatusBadge,
} from "../../src/ui/components";

const WEB_MAX_WIDTH = 1080;

type ViewMode = "grid" | "list";

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const sec = Math.round((Date.now() - then) / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  if (sec < 60) return "just now";
  if (min < 60) return `${min} min${min === 1 ? "" : "s"} ago`;
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  if (day < 30) return `${day} day${day === 1 ? "" : "s"} ago`;
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo} month${mo === 1 ? "" : "s"} ago`;
  const yr = Math.round(mo / 12);
  return `${yr} year${yr === 1 ? "" : "s"} ago`;
}

function categoryLabel(category: string): string {
  return CATEGORY_VISUALS[category as DocumentCategory]?.label ?? category;
}

function MetaText({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontFamily: theme.font.mono,
        fontSize: 11,
        letterSpacing: 1,
        textTransform: "uppercase",
        color: theme.muted,
      }}
    >
      {children}
    </Text>
  );
}

function DocumentCard({
  doc,
  onOpen,
  onDelete,
}: {
  doc: DocumentSummary;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const visual = CATEGORY_VISUALS[doc.category as DocumentCategory];
  const icon = visual?.icon ?? "FileText";
  const accent = visual?.accent ?? theme.accent;

  return (
    <View style={styles.cardShell}>
      <Pressable
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }, styles.cardPressable]}
        onPress={onOpen}
        accessibilityRole="button"
      >
        <Card style={styles.cardBody} accentTop hover>
          <View style={styles.cardTop}>
            <View style={[styles.iconWrap, { backgroundColor: `${accent}14` }]}>
              <Icon name={icon} size={22} color={accent} />
            </View>
            <StatusBadge status={doc.status as DocumentStatus} />
          </View>
          <Heading level={3} style={styles.cardTitle}>
            {doc.title}
          </Heading>
          <MetaText>{categoryLabel(doc.category)}</MetaText>
          <View style={styles.cardMeta}>
            <Icon name="Clock" size={13} color={theme.muted} />
            <View style={{ width: 6 }} />
            <Text style={styles.metaTime}>Updated {relativeTime(doc.updatedAt)}</Text>
          </View>
        </Card>
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.6 : 1 }]}
        onPress={onDelete}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${doc.title}`}
      >
        <Icon name="Trash2" size={18} color={theme.danger} />
      </Pressable>
    </View>
  );
}

export default function Library() {
  const user = useAppUser();
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("grid");

  const load = () => {
    if (!user.isLoaded || !user.isSignedIn || !user.userId) return;
    setLoading(true);
    setError(null);
    listDocuments(user)
      .then((res) => setDocs(res))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Failed to load documents.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.isLoaded, user.isSignedIn, user.userId]);

  const filtered = docs.filter((d) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      categoryLabel(d.category).toLowerCase().includes(q)
    );
  });

  const performDelete = async (docId: string) => {
    try {
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      await deleteDocument(user, docId);
      load();
    } catch {
      setError("Could not delete that document. Please try again.");
      load();
    }
  };

  const confirmDelete = (doc: DocumentSummary) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const ok = window.confirm(`Are you sure you want to delete "${doc.title}"? This cannot be undone.`);
      if (ok) {
        void performDelete(doc.id);
      }
      return;
    }

    Alert.alert(
      "Delete document",
      `Delete "${doc.title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void performDelete(doc.id),
        },
      ],
    );
  };

  const openDoc = (id: string) => router.push(`/document/${id}`);

  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isDesktop = width >= 768;
  const skeletonCount = isDesktop ? 6 : 4;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.body, isDesktop && styles.bodyWeb]}
    >
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <View style={isMobile ? { width: "100%", marginBottom: 12 } : { flex: 1 }}>
          <SectionLabel>Workspace</SectionLabel>
          <Heading level={1} style={styles.title}>
            Library
          </Heading>
        </View>
        {!loading && docs.length > 0 ? (
          <View style={[styles.segWrap, isMobile && { alignSelf: "flex-start", marginBottom: 12 }]}>
            <SegmentedControl<ViewMode>
              value={view}
              onChange={setView}
              options={[
                { value: "grid", label: "Grid", icon: "LayoutGrid" },
                { value: "list", label: "List", icon: "List" },
              ]}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.searchWrap}>
        <Icon name="Search" size={18} color={theme.muted} />
        <View style={{ width: 10 }} />
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search by title or category"
          style={styles.search}
        />
      </View>

      {loading ? (
        <View style={isDesktop ? styles.gridWeb : styles.gridMobile}>
          {Array.from({ length: skeletonCount }).map((_, k) => (
            <View key={k} style={isDesktop ? styles.skelShellWeb : styles.skelShell}>
              <Card>
                <View style={styles.skelTop}>
                  <Skeleton width={40} height={40} radius={10} />
                  <Skeleton width={64} height={20} radius={999} />
                </View>
                <Skeleton width="80%" height={18} style={{ marginTop: 16 }} />
                <Skeleton width="50%" height={12} style={{ marginTop: 10 }} />
                <Skeleton width="60%" height={12} style={{ marginTop: 16 }} />
              </Card>
            </View>
          ))}
        </View>
      ) : error ? (
        <View style={styles.errorWrap}>
          <ErrorText message={error} />
          <View style={{ height: 12 }} />
          <Button label="Retry" onPress={load} variant="secondary" />
        </View>
      ) : filtered.length === 0 ? (
        docs.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyArt}>
              <PageIllustration width={180} height={230} />
            </View>
            <EmptyState
              title="No documents yet"
              subtitle="Your generated reports and assessments will appear here. Start from a template to draft your first document."
              action={
                <View style={styles.emptyActions}>
                  <Button label="Create document" onPress={() => router.push("/document/new?def=pentest_agreement")} />
                  <View style={{ width: 12 }} />
                  <Button
                    label="Browse catalog"
                    variant="secondary"
                    onPress={() => router.push("/(app)/discover")}
                  />
                </View>
              }
            />
          </View>
        ) : (
          <EmptyState
            title="No matches"
            subtitle={`Nothing matches "${query}". Try a different search.`}
          />
        )
      ) : view === "list" ? (
        <View style={styles.listViewWrap}>
          {filtered.map((d) => {
            const visual = CATEGORY_VISUALS[d.category as DocumentCategory];
            const icon = visual?.icon ?? "FileText";
            const accent = visual?.accent ?? theme.accent;
            return (
              <Pressable
                key={d.id}
                style={({ pressed }) => [styles.listRowItem, pressed && { backgroundColor: theme.surface2 }]}
                onPress={() => openDoc(d.id)}
              >
                <View style={[styles.listIcon, { backgroundColor: `${accent}14` }]}>
                  <Icon name={icon} size={20} color={accent} />
                </View>
                <View style={styles.listTextWrap}>
                  <Text style={styles.listTitle} numberOfLines={1}>{d.title}</Text>
                  <Text style={styles.listCat}>{categoryLabel(d.category)} · Updated {relativeTime(d.updatedAt)}</Text>
                </View>
                <StatusBadge status={d.status as DocumentStatus} />
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation?.();
                    confirmDelete(d);
                  }}
                  hitSlop={8}
                  style={styles.listDelete}
                >
                  <Icon name="Trash2" size={17} color={theme.danger} />
                </Pressable>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={isDesktop ? styles.gridWeb : styles.gridMobile}>
          {filtered.map((d) => (
            <View key={d.id} style={isDesktop ? styles.cardShellWeb : styles.cardShell}>
              <DocumentCard
                doc={d}
                onOpen={() => openDoc(d.id)}
                onDelete={() => confirmDelete(d)}
              />
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  body: { padding: 16, paddingTop: 20, paddingBottom: 40 },
  bodyWeb: { maxWidth: WEB_MAX_WIDTH, width: "100%", alignSelf: "center", padding: 24, paddingTop: 32 },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerMobile: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  title: { marginTop: 2 },
  segWrap: { paddingBottom: 4 },
  searchWrap: { flexDirection: "row", alignItems: "center", marginBottom: 22 },
  search: { flex: 1, paddingVertical: 10 },
  gridWeb: { flexDirection: "row", flexWrap: "wrap", marginRight: -16 },
  gridMobile: { flexDirection: "column" },
  cardShellWeb: { width: "31.5%", marginRight: 16, marginBottom: 16 },
  skelShell: { width: "100%", marginBottom: 16 },
  skelShellWeb: { width: "31.5%", marginRight: 16, marginBottom: 16 },
  skelTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardShell: { width: "100%" },
  cardPressable: { flex: 1 },
  cardBody: { padding: 18 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 19, marginBottom: 6 },
  cardMeta: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  metaTime: { fontFamily: theme.font.sans, fontSize: 12, color: theme.muted },
  deleteBtn: { padding: 8, borderRadius: 8, marginLeft: 4 },
  errorWrap: { paddingVertical: 24, alignItems: "flex-start" },
  emptyWrap: { alignItems: "center", paddingVertical: 28 },
  emptyArt: { marginBottom: 8, opacity: 0.9 },
  emptyActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 18,
  },
  listViewWrap: { gap: 10 },
  listRowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    ...theme.shadowSm,
  },
  listIcon: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  listTextWrap: { flex: 1, minWidth: 0 },
  listTitle: { fontFamily: theme.font.serifSemi, fontSize: 16, color: theme.text, marginBottom: 3 },
  listCat: { fontFamily: theme.font.sans, fontSize: 12, color: theme.muted },
  listDelete: { padding: 8, marginLeft: 8 },
});
