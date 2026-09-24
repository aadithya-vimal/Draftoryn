import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAppUser } from "../../src/auth/clerk";
import { Button, Card, EmptyState, Heading, Input, Spinner, theme } from "../../src/ui/primitives";
import { Badge, SegmentedControl } from "../../src/ui/components";
import { createDocumentRecord } from "../../src/data/documents";
import { downloadResult } from "../../src/lib/download";
import { exportIntelligenceReport } from "../../src/intelligence/exporting/index";
import { reportToGeneratedDocument } from "../../src/intelligence/exporting/bridge";
import { resolveLegacyDefinitionId } from "../../src/engine/catalog/index";
import type { IntelligenceReport } from "../../src/intelligence/schemas/index";
import type { ExportFormat } from "../../src/engine/types";
import {
  createAnalysis,
  deleteAnalysis,
  describeArtifact,
  findingAction,
  assistFindingRemote,
  summaryDraftRemote,
  generateReport,
  getJob,
  listAnalyses,
  listArtifacts,
  listConflicts,
  listEvidence,
  listFindings,
  listReports,
  runAnalysis,
  uploadArtifact,
  type AnalysisProject,
  type AnalysisSummary,
  type ArtifactRow,
  type CandidateRow,
  type ConflictRow,
  type EvidenceRow,
  type ReportMeta,
} from "../../src/data/intelligence";

type Tab = "findings" | "evidence" | "conflicts" | "report";

const SEV_TONE: Record<string, "danger" | "warn" | "neutral" | "info"> = {
  critical: "danger",
  high: "danger",
  medium: "warn",
  low: "neutral",
  informational: "info",
};

function parseJsonArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v) as unknown;
      return Array.isArray(p) ? p.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function AnalyzePage() {
  const user = useAppUser();
  const router = useRouter();
  const [analyses, setAnalyses] = useState<AnalysisProject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [tab, setTab] = useState<Tab>("findings");

  const [artifacts, setArtifacts] = useState<ArtifactRow[]>([]);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [evidence, setEvidence] = useState<EvidenceRow[]>([]);
  const [conflicts, setConflicts] = useState<ConflictRow[]>([]);
  const [reports, setReports] = useState<ReportMeta[]>([]);
  const [lastSummary, setLastSummary] = useState<AnalysisSummary | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Finding-workbench state
  const [expanded, setExpanded] = useState<string | null>(null);
  const [mergeSel, setMergeSel] = useState<string[]>([]);
  const [impact, setImpact] = useState("");
  const [remediation, setRemediation] = useState("");
  const [repro, setRepro] = useState("");

  // Report-builder state
  const [client, setClient] = useState("");
  const [assessmentName, setAssessmentName] = useState("");
  const [execNotes, setExecNotes] = useState("");
  const [view, setView] = useState("full");
  const [reportDoc, setReportDoc] = useState<Record<string, unknown> | null>(null);
  const [qualityFailures, setQualityFailures] = useState<string[]>([]);

  // Session-only AI credentials (never stored).
  const [aiProvider, setAiProvider] = useState("openai");
  const [aiModel, setAiModel] = useState("");
  const [aiKey, setAiKey] = useState("");
  const [visionResult, setVisionResult] = useState<Record<string, string> | null>(null);

  // Paste-upload state (native + large files)
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteName, setPasteName] = useState("notes.md");
  const [pasteText, setPasteText] = useState("");

  const dropRef = useRef<View | null>(null);

  const reload = useCallback(async () => {
    if (!user.isSignedIn) return;
    setLoading(true);
    try {
      const list = await listAnalyses(user);
      setAnalyses(list);
      if (!selectedId && list[0]) setSelectedId(list[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analyses.");
    } finally {
      setLoading(false);
    }
  }, [user.isSignedIn, selectedId, user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const reloadDetail = useCallback(async () => {
    if (!user.isSignedIn || !selectedId) return;
    try {
      const [arts, f, ev, cf, rp] = await Promise.all([
        listArtifacts(user, selectedId),
        listFindings(user, selectedId),
        listEvidence(user, selectedId),
        listConflicts(user, selectedId),
        listReports(user, selectedId),
      ]);
      setArtifacts(arts);
      setCandidates(f.candidates);
      setEvidence(ev);
      setConflicts(cf);
      setReports(rp);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analysis detail.");
    }
  }, [user, selectedId]);

  useEffect(() => {
    reloadDetail();
  }, [reloadDetail]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const created = await createAnalysis(user, { name, reportType: "pentest_report" });
      setNewName("");
      setAnalyses((p) => [created, ...p]);
      setSelectedId(created.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create analysis.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    try {
      await deleteAnalysis(user, id);
      setAnalyses((p) => p.filter((a) => a.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete analysis.");
    } finally {
      setBusy(false);
    }
  };

  const uploadText = async (filename: string, content: string, encoding: "text" | "base64" = "text", mediaType = "text/plain") => {
    if (!selectedId || !content) return;
    setBusy(true);
    setError(null);
    try {
      await uploadArtifact(user, selectedId, { filename, mediaType, content, encoding });
      await reloadDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  const TEXT_EXT = ["txt", "md", "log", "csv", "json", "jsonl", "xml", "yaml", "yml", "nessus"];

  const uploadBrowserFile = async (name: string, buf: ArrayBuffer) => {
    const ext = name.toLowerCase().split(".").pop() ?? "";
    if (TEXT_EXT.includes(ext)) {
      await uploadText(name, new TextDecoder().decode(buf), "text", "text/plain");
      return;
    }
    const bytes = new Uint8Array(buf);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      bin += String.fromCharCode(...bytes.slice(i, i + 8192));
    }
    const btoaFn = (globalThis as unknown as { btoa?: (s: string) => string }).btoa;
    if (!btoaFn) {
      setError("Binary upload is not supported in this environment.");
      return;
    }
    const media = ext === "pdf" ? "application/pdf" : ext === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "application/octet-stream";
    await uploadText(name, btoaFn(bin), "base64", media);
  };

  const pickFilesWeb = () => {
    if (Platform.OS !== "web") {
      setPasteOpen(true);
      return;
    }
    const doc = globalThis as unknown as { document?: Document };
    if (!doc.document) {
      setPasteOpen(true);
      return;
    }
    const el = doc.document.createElement("input");
    el.type = "file";
    el.multiple = true;
    el.onchange = () => {
      const files = Array.from(el.files ?? []);
      void (async () => {
        for (const f of files.slice(0, 12)) {
          await uploadBrowserFile(f.name, await f.arrayBuffer());
        }
      })();
    };
    el.click();
  };

  // Web drag-and-drop onto the upload card.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const node = dropRef.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== "function") return;
    const over = (e: Event) => e.preventDefault();
    const drop = (e: Event) => {
      e.preventDefault();
      const files = (e as unknown as { dataTransfer?: { files?: File[] } }).dataTransfer?.files;
      if (!files) return;
      void (async () => {
        for (const f of Array.from(files).slice(0, 12)) {
          await uploadBrowserFile(f.name, await f.arrayBuffer());
        }
      })();
    };
    node.addEventListener("dragover", over);
    node.addEventListener("drop", drop);
    return () => {
      node.removeEventListener("dragover", over);
      node.removeEventListener("drop", drop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const handleRun = async () => {
    if (!selectedId || running) return;
    setRunning(true);
    setRunError(null);
    try {
      const { jobId, summary } = await runAnalysis(user, selectedId);
      setLastSummary(summary);
      // Poll for terminal state (fast local path usually completes inline).
      for (let i = 0; i < 30; i++) {
        const job = await getJob(user, jobId);
        if (job.status === "completed" || job.status === "failed") {
          if (job.status === "failed") throw new Error(job.error ?? "Analysis failed.");
          break;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      await reloadDetail();
    } catch (e) {
      setRunError(e instanceof Error ? e.message : "Analysis run failed.");
    } finally {
      setRunning(false);
    }
  };

  const act = async (fid: string, body: Record<string, unknown>) => {
    if (!selectedId) return;
    setBusy(true);
    try {
      await findingAction(user, selectedId, fid, body);
      await reloadDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Finding action failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleMerge = async () => {
    if (mergeSel.length < 2) return;
    const [primary, ...rest] = mergeSel;
    await act(primary!, { action: "merge", ids: mergeSel, primaryId: primary });
    setMergeSel([]);
  };

  const handleConfirm = async (fid: string) => {
    const rem = remediation.split("\n").map((s) => s.trim()).filter(Boolean);
    await act(fid, {
      action: "confirm",
      impact: impact.trim(),
      remediation: rem,
      reproduction: repro.split("\n").map((s) => s.trim()).filter(Boolean),
    });
    setImpact("");
    setRemediation("");
    setRepro("");
  };

  const handleGenerate = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await generateReport(user, selectedId, {
        view,
        engagement: { client: client.trim() || undefined, assessmentName: assessmentName.trim() || undefined, executiveNotes: execNotes.trim() || undefined },
      });
      const doc = res.report as Record<string, unknown>;
      setReportDoc(doc);
      setQualityFailures((doc["qualityFailures"] as string[] | undefined) ?? []);
      await reloadDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Report generation failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async (format: ExportFormat) => {
    if (!reportDoc) return;
    setBusy(true);
    try {
      const result = await exportIntelligenceReport(reportDoc as unknown as IntelligenceReport, format);
      await downloadResult(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!reportDoc || !user.userId) return;
    setBusy(true);
    try {
      const report = reportDoc as unknown as IntelligenceReport;
      const doc = reportToGeneratedDocument(report);
      const now = new Date().toISOString();
      const record = {
        id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        definitionId: resolveLegacyDefinitionId(report.type),
        ownerId: user.userId,
        title: doc.title,
        status: "ready" as const,
        createdAt: now,
        updatedAt: now,
        currentVersionId: "v1",
        source: { sourceAnalysisId: report.sourceAnalysisId, intelligenceReportId: report.id },
        versions: [
          {
            id: "v1",
            versionNumber: 1,
            title: doc.title,
            createdAt: now,
            note: `Generated from analysis ${report.sourceAnalysisId}`,
            source: {},
            model: doc.model,
            sections: doc.sections,
            status: "ready" as const,
          },
        ],
      };
      await createDocumentRecord(user, record);
      router.push("/(app)/library");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save to library failed.");
    } finally {
      setBusy(false);
    }
  };

  const aiCreds = () => ({
    provider: aiProvider || undefined,
    model: aiModel.trim() || undefined,
    apiKey: aiKey.trim() || undefined,
  });

  const handleDescribe = async (artifactId: string) => {
    if (!selectedId) return;
    setBusy(true);
    setVisionResult(null);
    try {
      const res = await describeArtifact(user, selectedId, artifactId, aiCreds());
      setVisionResult({ description: res.description, visibleText: res.visibleText, confidence: res.confidence });
      await reloadDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI Describe failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleAssist = async (fid: string) => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await assistFindingRemote(user, selectedId, fid, aiCreds());
      const d = res.draft as Record<string, unknown>;
      if (typeof d["impact"] === "string") setImpact(d["impact"]);
      if (Array.isArray(d["remediation"])) setRemediation((d["remediation"] as string[]).join("\n"));
      if (Array.isArray(d["reproduction"])) setRepro((d["reproduction"] as string[]).join("\n"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI Assist failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleSummaryDraft = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await summaryDraftRemote(user, selectedId, aiCreds());
      setExecNotes(res.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Summary draft failed.");
    } finally {
      setBusy(false);
    }
  };

  const selected = analyses.find((a) => a.id === selectedId) ?? null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.body}>
      <View style={styles.maxContainer}>
        <Text style={styles.eyebrow}>EVIDENCE → INTELLIGENCE → REPORT</Text>
        <Heading level={1} style={styles.h1}>Analyze Evidence</Heading>
        <Text style={styles.lead}>
          Upload assessment artifacts. Draftoryn parses, correlates, deduplicates and flags conflicts —
          then generates a client-ready report grounded only in your evidence.
        </Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>AI ASSIST — SESSION KEY ONLY (NEVER STORED)</Text>
          <View style={styles.row}>
            {(["openai", "anthropic", "gemini"] as const).map((p) => (
              <Pressable key={p} onPress={() => setAiProvider(p)} style={[styles.viewChip, aiProvider === p && styles.viewChipActive]}>
                <Text style={styles.viewChipText}>{p.toUpperCase()}</Text>
              </Pressable>
            ))}
            <Input value={aiModel} onChangeText={setAiModel} placeholder="Model (optional)" style={styles.flex} />
            <Input value={aiKey} onChangeText={setAiKey} placeholder="API key (or server key)" secure style={styles.flex} />
          </View>
        </Card>

        <View style={styles.columns}>
          <View style={styles.side}>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>ANALYSES</Text>
              <View style={styles.row}>
                <Input value={newName} onChangeText={setNewName} placeholder="New analysis name…" style={styles.flex} />
                <Button label="New" onPress={handleCreate} />
              </View>
              {loading ? <Spinner /> : null}
              {analyses.map((a) => (
                <Pressable key={a.id} onPress={() => setSelectedId(a.id)} style={[styles.analysisRow, a.id === selectedId && styles.analysisRowActive]}>
                  <View style={styles.flex}>
                    <Text style={styles.analysisName}>{a.name}</Text>
                    <Text style={styles.analysisMeta}>{a.status} · {a.report_type}</Text>
                  </View>
                  <Pressable onPress={() => handleDelete(a.id)} hitSlop={8}>
                    <Text style={styles.delete}>✕</Text>
                  </Pressable>
                </Pressable>
              ))}
              {analyses.length === 0 && !loading ? <EmptyState title="No analyses yet" subtitle="Create one to begin." /> : null}
            </Card>
          </View>

          <View style={styles.main}>
            {!selected ? (
              <EmptyState title="Select an analysis" subtitle="Or create a new one to upload evidence." />
            ) : (
              <>
                <Card style={styles.card}>
                  <Text style={styles.cardTitle}>UPLOAD EVIDENCE — {selected.name.toUpperCase()}</Text>
                  <View ref={dropRef} style={styles.dropZone}>
                    <Text style={styles.dropText}>
                      {Platform.OS === "web" ? "Drag & drop files here, or use the picker." : "Use the picker or paste text below."}
                    </Text>
                    <View style={styles.row}>
                      <Button label={busy ? "Working…" : "Add files"} onPress={pickFilesWeb} />
                      <Button label="Paste text" variant="secondary" onPress={() => setPasteOpen((v) => !v)} />
                      <Button label={running ? "Analyzing…" : "Run analysis"} variant="secondary" onPress={handleRun} />
                    </View>
                  </View>
                  {pasteOpen ? (
                    <View style={styles.pasteBox}>
                      <Input value={pasteName} onChangeText={setPasteName} placeholder="filename (e.g. notes.md)" />
                      <Input value={pasteText} onChangeText={setPasteText} placeholder="Paste artifact text…" multiline style={styles.pasteInput} />
                      <Button label="Upload pasted text" onPress={() => { void uploadText(pasteName.trim() || "notes.md", pasteText); setPasteText(""); }} />
                    </View>
                  ) : null}
                  {runError ? <Text style={styles.error}>{runError}</Text> : null}
                  <View style={styles.artifactList}>
                    {artifacts.map((a) => (
                      <View key={a.id} style={styles.artifactRow}>
                        <Text style={styles.artifactName}>{a.filename}</Text>
                        <View style={styles.row}>
                          <Badge tone={a.status === "parsed" ? "neutral" : "warn"}>{a.artifact_type} · {a.status}</Badge>
                          {a.media_type.startsWith("image/") || a.artifact_type === "image" ? (
                            <Button label="AI Describe" variant="secondary" onPress={() => handleDescribe(a.id)} />
                          ) : null}
                        </View>
                      </View>
                    ))}
                    {artifacts.length === 0 ? <Text style={styles.muted}>No artifacts yet.</Text> : null}
                    {visionResult ? (
                      <View style={styles.evBox}>
                        <Text style={styles.qTitle}>AI VISION ({visionResult.confidence}) — VERIFY BEFORE CITING</Text>
                        <Text style={styles.evLine}>{visionResult.description}</Text>
                        {visionResult.visibleText ? <Text style={styles.evLine}>Text: {visionResult.visibleText}</Text> : null}
                      </View>
                    ) : null}
                  </View>
                </Card>

                {lastSummary ? (
                  <Card style={styles.card}>
                    <Text style={styles.cardTitle}>ANALYSIS SUMMARY</Text>
                    <View style={styles.statsGrid}>
                      {[
                        ["FILES", `${lastSummary.filesAnalyzed} ✓ ${lastSummary.filesFailed} ✗ ${lastSummary.duplicateFiles} dup`],
                        ["ASSETS", `${lastSummary.assetsIdentified}`],
                        ["OBSERVATIONS", `${lastSummary.observationsExtracted}`],
                        ["FINDINGS", `${lastSummary.candidatesProposed} (${lastSummary.duplicatesMerged} merged)`],
                        ["CONFLICTS", `${lastSummary.conflictsOpen}`],
                        ["MISSING", `${lastSummary.missingItems}`],
                        ["MAPPED", lastSummary.standardsMapped.join(" · ") || "—"],
                      ].map(([k, v]) => (
                        <View key={k} style={styles.stat}>
                          <Text style={styles.statKey}>{k}</Text>
                          <Text style={styles.statVal}>{v}</Text>
                        </View>
                      ))}
                    </View>
                  </Card>
                ) : null}

                <SegmentedControl
                  value={tab}
                  onChange={(v) => setTab(v as Tab)}
                  options={[
                    { value: "findings", label: `Findings (${candidates.length})` },
                    { value: "evidence", label: `Evidence (${evidence.length})` },
                    { value: "conflicts", label: `Conflicts (${conflicts.length})` },
                    { value: "report", label: `Report (${reports.length})` },
                  ]}
                />

                {tab === "findings" ? (
                  <View>
                    {mergeSel.length >= 2 ? (
                      <View style={styles.row}>
                        <Button label={`Merge ${mergeSel.length} into first selected`} onPress={handleMerge} />
                        <Button label="Clear selection" variant="secondary" onPress={() => setMergeSel([])} />
                      </View>
                    ) : null}
                    {candidates.map((c) => {
                      const evIds = parseJsonArray(c.evidence_ids);
                      const isOpen = expanded === c.id;
                      return (
                        <Card key={c.id} style={styles.card}>
                          <View style={styles.row}>
                            <Badge tone={SEV_TONE[c.severity] ?? "neutral"}>{c.severity.toUpperCase()}</Badge>
                            <Badge tone="info">{c.status.toUpperCase()}</Badge>
                            <View style={styles.flex}>
                              <Text style={styles.findingTitle}>{c.title}</Text>
                              <Text style={styles.muted}>{c.confidence} confidence · {c.evidence_level} · {evIds.length} evidence</Text>
                            </View>
                            <Pressable onPress={() => setMergeSel((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id]))} hitSlop={8}>
                              <Text style={[styles.muteds, mergeSel.includes(c.id) && styles.mergeOn]}>{mergeSel.includes(c.id) ? "◉" : "○"}</Text>
                            </Pressable>
                          </View>
                          <Pressable onPress={() => setExpanded(isOpen ? null : c.id)}>
                            <Text style={styles.link}>{isOpen ? "Hide evidence ▴" : "Show evidence ▾"}</Text>
                          </Pressable>
                          {isOpen ? (
                            <View style={styles.evBox}>
                              {evIds.map((e) => {
                                const rec = evidence.find((x) => x.id === e);
                                return <Text key={e} style={styles.evLine}>• {e}{rec ? ` — ${rec.title} (${rec.source_artifact_id} @ ${rec.source_location})` : ""}</Text>;
                              })}
                              {c.description ? <Text style={styles.evLine}>{c.description.slice(0, 600)}</Text> : null}
                              <Text style={styles.label}>IMPACT (required to confirm)</Text>
                              <Input value={impact} onChangeText={setImpact} placeholder="Evidence-grounded impact…" multiline />
                              <Text style={styles.label}>REMEDIATION — one step per line (required)</Text>
                              <Input value={remediation} onChangeText={setRemediation} placeholder={"Enforce authorization checks\nAdd regression tests"} multiline />
                              <Text style={styles.label}>REPRODUCTION — one step per line (optional)</Text>
                              <Input value={repro} onChangeText={setRepro} placeholder="Steps to reproduce…" multiline />
                            </View>
                          ) : null}
                          <View style={styles.actionRow}>
                            <Button label="Accept" variant="secondary" onPress={() => act(c.id, { action: "accept" })} />
                            <Button label="AI Assist" variant="secondary" onPress={() => handleAssist(c.id)} />
                            <Button label="Confirm" onPress={() => handleConfirm(c.id)} />
                            <Button label="Reject" variant="secondary" onPress={() => act(c.id, { action: "reject" })} />
                            <Button label="Unverified" variant="secondary" onPress={() => act(c.id, { action: "unverified" })} />
                          </View>
                        </Card>
                      );
                    })}
                    {candidates.length === 0 ? <EmptyState title="No findings yet" subtitle="Upload artifacts and run the analysis." /> : null}
                  </View>
                ) : null}

                {tab === "evidence" ? (
                  <Card style={styles.card}>
                    {evidence.slice(0, 200).map((e) => (
                      <Text key={e.id} style={styles.evLine}>• [{e.evidence_type}] {e.title} — {e.source_artifact_id} @ {e.source_location}</Text>
                    ))}
                    {evidence.length === 0 ? <Text style={styles.muted}>No evidence yet.</Text> : null}
                  </Card>
                ) : null}

                {tab === "conflicts" ? (
                  <Card style={styles.card}>
                    {conflicts.map((cf) => (
                      <View key={cf.id} style={styles.conflict}>
                        <Badge tone="warn">{cf.kind.toUpperCase()} · {cf.resolution.toUpperCase()}</Badge>
                        <Text style={styles.evLine}>{cf.summary}</Text>
                      </View>
                    ))}
                    {conflicts.length === 0 ? <Text style={styles.muted}>No conflicts detected.</Text> : null}
                  </Card>
                ) : null}

                {tab === "report" ? (
                  <Card style={styles.card}>
                    <Text style={styles.cardTitle}>REPORT BUILDER</Text>
                    <View style={styles.row}>
                      <Input value={client} onChangeText={setClient} placeholder="Client / organization" style={styles.flex} />
                      <Input value={assessmentName} onChangeText={setAssessmentName} placeholder="Assessment name" style={styles.flex} />
                    </View>
                    <Text style={styles.label}>EXECUTIVE NOTES (analyst-approved; prepended to summary)</Text>
                    <Input value={execNotes} onChangeText={setExecNotes} placeholder="Reviewed narrative…" multiline />
                    <View style={styles.row}>
                      <Button label="AI Draft Summary" variant="secondary" onPress={handleSummaryDraft} />
                    </View>
                    <View style={styles.row}>
                      {(["executive", "technical", "full"] as const).map((v) => (
                        <Pressable key={v} onPress={() => setView(v)} style={[styles.viewChip, view === v && styles.viewChipActive]}>
                          <Text style={styles.viewChipText}>{v.toUpperCase()}</Text>
                        </Pressable>
                      ))}
                      <Button label={busy ? "Generating…" : "Generate report"} onPress={handleGenerate} />
                    </View>
                    {qualityFailures.length > 0 ? (
                      <View style={styles.qBox}>
                        <Text style={styles.qTitle}>QUALITY GATE — REVIEW REQUIRED</Text>
                        {qualityFailures.map((f, i) => (
                          <Text key={i} style={styles.evLine}>• {f}</Text>
                        ))}
                      </View>
                    ) : null}
                    {reportDoc ? (
                      <View style={styles.reportBody}>
                        <View style={styles.row}>
                          {(["markdown", "html", "json", "xml", "yaml", "pdf"] as const).map((f) => (
                            <Button key={f} label={f.toUpperCase()} variant="secondary" onPress={() => handleExport(f)} />
                          ))}
                          <Button label="Save to Library" onPress={handleSaveToLibrary} />
                        </View>
                        {((reportDoc["sections"] as Array<{ id: string; title: string; body: string }>) ?? []).map((s) => (
                          <View key={s.id} style={styles.section}>
                            <Text style={styles.sectionTitle}>{s.title}</Text>
                            <Text style={styles.sectionBody}>{s.body.slice(0, 4000)}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.muted}>Versions: {reports.map((r) => `v${r.version} (${r.view}/${r.status})`).join(", ") || "none yet"}.</Text>
                    )}
                  </Card>
                ) : null}
              </>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  body: { paddingBottom: 48 },
  maxContainer: { maxWidth: 1180, width: "100%", alignSelf: "center", paddingHorizontal: 24 },
  eyebrow: { fontFamily: theme.font.monoMedium, fontSize: 11, letterSpacing: 1.54, color: theme.accent, marginTop: 32, marginBottom: 8 },
  h1: { fontSize: 34, color: theme.text, letterSpacing: -1, marginBottom: 8 },
  lead: { fontFamily: theme.font.sans, fontSize: 15, color: theme.textSecondary, lineHeight: 22, maxWidth: 800, marginBottom: 20 },
  error: { fontFamily: theme.font.mono, fontSize: 12, color: "#f87171", marginBottom: 12 },
  columns: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  side: { width: 300, minWidth: 260 },
  main: { flex: 1, minWidth: 300, gap: 0 },
  card: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 16, marginBottom: 16 },
  cardTitle: { fontFamily: theme.font.monoMedium, fontSize: 11, letterSpacing: 1.4, color: theme.muted, marginBottom: 12 },
  row: { flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 },
  flex: { flex: 1 },
  analysisRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, borderTopWidth: 1, borderColor: theme.border },
  analysisRowActive: { backgroundColor: theme.surface2, borderRadius: 6, paddingHorizontal: 8 },
  analysisName: { fontFamily: theme.font.sansSemi, fontSize: 14, color: theme.text },
  analysisMeta: { fontFamily: theme.font.mono, fontSize: 10, color: theme.muted },
  delete: { color: theme.muted, fontSize: 14 },
  dropZone: { borderWidth: 1, borderStyle: "dashed", borderColor: theme.borderActive, borderRadius: 8, padding: 16, marginBottom: 12 },
  dropText: { fontFamily: theme.font.sans, fontSize: 13, color: theme.textSecondary, marginBottom: 12 },
  pasteBox: { gap: 8, marginBottom: 12 },
  pasteInput: { minHeight: 120 },
  artifactList: { gap: 6 },
  artifactRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  artifactName: { fontFamily: theme.font.mono, fontSize: 12, color: theme.text },
  muted: { fontFamily: theme.font.sans, fontSize: 13, color: theme.muted },
  muteds: { fontSize: 18, color: theme.muted },
  mergeOn: { color: theme.accent },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: { minWidth: 140, flex: 1 },
  statKey: { fontFamily: theme.font.monoMedium, fontSize: 10, letterSpacing: 1.2, color: theme.muted },
  statVal: { fontFamily: theme.font.sansSemi, fontSize: 15, color: theme.text },
  findingTitle: { fontFamily: theme.font.sansSemi, fontSize: 15, color: theme.text },
  link: { fontFamily: theme.font.mono, fontSize: 11, color: theme.accent, marginTop: 8 },
  evBox: { marginTop: 8, gap: 8, backgroundColor: theme.surface2, borderRadius: 6, padding: 12 },
  evLine: { fontFamily: theme.font.mono, fontSize: 11.5, color: theme.textSecondary, lineHeight: 17 },
  label: { fontFamily: theme.font.monoMedium, fontSize: 10, letterSpacing: 1, color: theme.muted, marginTop: 4 },
  actionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 12 },
  conflict: { gap: 6, marginBottom: 12, borderBottomWidth: 1, borderColor: theme.border, paddingBottom: 12 },
  viewChip: { paddingVertical: 7, paddingHorizontal: 14, borderWidth: 1, borderColor: theme.border, borderRadius: 20 },
  viewChipActive: { borderColor: theme.accent, backgroundColor: theme.surfaceHover },
  viewChipText: { fontFamily: theme.font.monoMedium, fontSize: 11, color: theme.text },
  qBox: { backgroundColor: theme.surface2, borderRadius: 6, padding: 12, marginTop: 12, gap: 4 },
  qTitle: { fontFamily: theme.font.monoMedium, fontSize: 11, color: "#fbbf24", letterSpacing: 1 },
  reportBody: { marginTop: 12, gap: 16 },
  section: { borderTopWidth: 1, borderColor: theme.border, paddingTop: 12 },
  sectionTitle: { fontFamily: theme.font.sansSemi, fontSize: 16, color: theme.text, marginBottom: 6 },
  sectionBody: { fontFamily: theme.font.sans, fontSize: 13, color: theme.textSecondary, lineHeight: 20 },
});
