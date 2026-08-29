import React, { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

import {
  theme,
  Heading,
  SectionLabel,
  Card,
  Button,
  ErrorText,
  Screen,
} from "../../src/ui/primitives";
import {
  Icon,
  ProgressBar,
} from "../../src/ui/components";
import { CATEGORY_VISUALS } from "../../src/ui/categories";
import { FieldRenderer } from "../../src/ui/FieldRenderer";
import { getDefinition } from "../../src/engine/definitions/catalog";
import { generateDocumentClient } from "../../src/data/generate";
import { createDocumentRecord } from "../../src/data/documents";
import { createVersion } from "../../src/engine/serialization";
import { useAppUser } from "../../src/auth/clerk";
import type { DocumentStatus, FieldDef, GeneratedDocument } from "../../src/engine/types";
import type { DocumentRecord, DocumentVersion } from "../../src/repository/types";

const FIELDS_PER_STEP = 4;

function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
}

function normalizeParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function summarizeSource(fields: FieldDef[], source: Record<string, unknown>): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  for (const f of fields) {
    const raw = source[f.id];
    if (isEmptyValue(raw)) continue;
    let display = "";
    if (typeof raw === "string") display = raw;
    else if (Array.isArray(raw)) display = raw.map((r) => (typeof r === "string" ? r : JSON.stringify(r))).join(", ");
    else display = JSON.stringify(raw);
    if (display.length > 60) display = `${display.slice(0, 57)}…`;
    out.push({ label: f.label, value: display });
    if (out.length >= 6) break;
  }
  return out;
}

export default function NewDocumentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useAppUser();

  const defId = normalizeParam(params.defId) || normalizeParam(params.def);
  const def = defId ? getDefinition(defId) : undefined;

  const [source, setSource] = useState<Record<string, unknown>>({});
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  const change = (id: string, value: unknown) =>
    setSource((s) => ({ ...s, [id]: value }));

  const steps = useMemo<FieldDef[][]>(() => {
    if (!def) return [];
    const groups: FieldDef[][] = [];
    for (let i = 0; i < def.fields.length; i += FIELDS_PER_STEP) {
      groups.push(def.fields.slice(i, i + FIELDS_PER_STEP));
    }
    if (groups.length === 0) groups.push([]);
    return groups;
  }, [def]);

  const totalSteps = Math.max(1, steps.length);
  const currentStepFields = steps[Math.min(step, totalSteps - 1)] ?? [];
  const isLastStep = step >= totalSteps - 1;

  if (!def) {
    return (
      <Screen title="New document">
        <Card accentTop style={styles.centerCard}>
          <Icon name="FileQuestion" size={28} color={theme.muted} />
          <Heading level={3} style={styles.unknownTitle}>Unknown document type</Heading>
          <Text style={styles.muted}>We couldn’t find the document template you’re looking for.</Text>
          <View style={styles.unknownActions}>
            <Button
              label="Back to Discover"
              onPress={() => router.replace("/(app)/discover")}
            />
          </View>
        </Card>
      </Screen>
    );
  }

  const visual = CATEGORY_VISUALS[def.category];

  const validateStep = (fields: FieldDef[]): boolean => {
    const missing = fields.find((f) => f.required === true && isEmptyValue(source[f.id]));
    if (missing) {
      setError(`Please complete the required field “${missing.label}” before continuing.`);
      return false;
    }
    setError("");
    return true;
  };

  const goBack = () => {
    if (step === 0) {
      router.back();
      return;
    }
    setError("");
    setStep((s) => Math.max(0, s - 1));
  };

  const goNext = () => {
    if (!validateStep(currentStepFields)) return;
    if (!isLastStep) {
      setStep((s) => Math.min(totalSteps - 1, s + 1));
    }
  };

  const goToStep = (target: number) => {
    setError("");
    setStep(Math.max(0, Math.min(totalSteps - 1, target)));
  };

  const onGenerate = async () => {
    if (!validateStep(currentStepFields)) return;
    setBusy(true);
    setError("");
    try {
      const gen: GeneratedDocument = await generateDocumentClient(def.id, source, {
        getToken: user.getToken,
      });
      const version: DocumentVersion = createVersion(
        1,
        gen.title,
        source,
        gen.model,
        gen.sections,
        "ready" as DocumentStatus,
        "Initial draft",
      );
      const now = new Date().toISOString();
      const id = `doc_${Date.now().toString(36)}`;
      const record: DocumentRecord = {
        id,
        definitionId: def.id,
        ownerId: user.userId ?? "anonymous",
        title: gen.title,
        status: "ready",
        createdAt: now,
        updatedAt: now,
        currentVersionId: version.id,
        source,
        versions: [version],
      };
      await createDocumentRecord(user, record);
      router.replace(`/document/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed. Please try again.");
      setBusy(false);
    }
  };

  const progress = (step + 1) / totalSteps;
  const summary = summarizeSource(def.fields, source);

  const topBar = (
    <View style={styles.topBar}>
      <TouchableOpacity style={styles.backPill} onPress={goBack}>
        <Icon name="ArrowLeft" size={18} color={theme.text} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
      <View style={styles.topBarTitle}>
        <Icon name={visual.icon} size={20} color={visual.accent} />
        <Text style={styles.topBarName}>{def.name}</Text>
        <Text style={styles.topBarCat}>{visual.label}</Text>
      </View>
      <View style={styles.topBarProgress}>
        <ProgressBar value={progress} />
        <Text style={styles.topBarPct}>Step {step + 1} of {totalSteps}</Text>
      </View>
    </View>
  );

  const overviewCard = (
    <Card style={styles.overviewCard}>
      <SectionLabel>About this document</SectionLabel>
      <Text style={styles.bodyText}>{def.description}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Audience</Text>
        <Text style={styles.metaValue}>{def.intendedAudience}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Purpose</Text>
        <Text style={styles.metaValue}>{def.purpose}</Text>
      </View>
      <View style={styles.stepsHeader}>
        <SectionLabel>Your progress</SectionLabel>
      </View>
      {steps.map((group, i) => {
        const active = i === step;
        return (
          <TouchableOpacity
            key={i}
            style={[styles.stepItem, active && styles.stepItemActive]}
            onPress={() => goToStep(i)}
          >
            <Icon
              name={active ? "CircleDot" : "Circle"}
              size={16}
              color={active ? theme.accent : theme.muted}
            />
            <Text style={[styles.stepItemText, active && styles.stepItemTextActive]}>
              Details {i + 1}
            </Text>
            {group.some((f) => f.required && !isEmptyValue(source[f.id])) ? (
              <Icon name="Check" size={14} color={theme.ok ?? theme.muted} />
            ) : null}
          </TouchableOpacity>
        );
      })}
    </Card>
  );

  const fieldsCard = (
    <Card accentTop style={styles.fieldsCard}>
      <Heading level={3} style={styles.fieldsTitle}>
        {isLastStep ? "Final details" : `Details ${step + 1}`}
      </Heading>
      <Text style={styles.fieldsHelper}>
        {currentStepFields.length > 0
          ? "Complete the fields below. Fields marked as required must be filled to continue."
          : "This template has no entry fields — you can generate it directly."}
      </Text>
      <FieldRenderer fields={currentStepFields} source={source} onChange={change} />
      {error ? <ErrorText message={error} /> : null}
    </Card>
  );

  const helpCard = (
    <Card style={styles.helpCard}>
      <SectionLabel>Why we ask</SectionLabel>
      <Text style={styles.bodyText}>
        These inputs shape the document’s structure, tone, and the specifics we
        generate. The more precise you are, the less you’ll need to edit later.
      </Text>
      <View style={styles.helpHeader}>
        <SectionLabel>What happens next</SectionLabel>
      </View>
      <Text style={styles.bodyText}>
        After the last step, we assemble your draft, run validation, and open it
        for review. You can regenerate any section afterwards.
      </Text>
      <SectionLabel style={styles.helpHeader}>Live summary</SectionLabel>
      {summary.length === 0 ? (
        <Text style={styles.muted}>Nothing filled in yet.</Text>
      ) : (
        summary.map((row) => (
          <View key={row.label} style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{row.label}</Text>
            <Text style={styles.summaryValue} numberOfLines={2}>{row.value}</Text>
          </View>
        ))
      )}
    </Card>
  );

  const generatingCard = (
    <Card accentTop style={styles.fieldsCard}>
      <View style={styles.genInner}>
        <Icon name="Sparkles" size={26} color={theme.accent} />
        <Heading level={3} style={styles.genTitle}>Generating your document…</Heading>
        <ProgressBar indeterminate />
        <Text style={styles.genSub}>Preparing structure · Generating content · Validating</Text>
      </View>
    </Card>
  );

  const bottomNav = (
    <View style={styles.bottomNav}>
      <Button
        label="Back"
        variant="secondary"
        disabled={step === 0 || busy}
        onPress={goBack}
        style={styles.navBtn}
      />
      {isLastStep ? (
        <Button
          label={busy ? "Generating…" : "Generate document"}
          disabled={busy}
          onPress={onGenerate}
          style={styles.navBtn}
        />
      ) : (
        <Button
          label="Continue"
          disabled={busy}
          onPress={goNext}
          style={styles.navBtn}
        />
      )}
    </View>
  );

  if (Platform.OS === "web") {
    return (
      <View style={styles.webShell}>
        {topBar}
        <View style={styles.webRow}>
          <View style={styles.webLeft}>{overviewCard}</View>
          <ScrollView style={styles.webCenter} contentContainerStyle={styles.webCenterInner}>
            {busy ? generatingCard : fieldsCard}
            {!busy ? bottomNav : null}
          </ScrollView>
          <View style={styles.webRight}>{helpCard}</View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      {topBar}
      <ScrollView style={styles.mobileScroll} contentContainerStyle={styles.mobileInner}>
        <Card style={styles.overviewCard}>
          <SectionLabel>About</SectionLabel>
          <Text style={styles.bodyText}>{def.description}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Audience</Text>
            <Text style={styles.metaValue}>{def.intendedAudience}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Purpose</Text>
            <Text style={styles.metaValue}>{def.purpose}</Text>
          </View>
        </Card>
        {busy ? generatingCard : fieldsCard}
        <Card style={styles.helpCard}>
          <SectionLabel>Why we ask</SectionLabel>
          <Text style={styles.bodyText}>
            These inputs shape the document’s structure and tone, and the
            specifics we generate for you.
          </Text>
      <View style={styles.helpHeader}>
        <SectionLabel>Live summary</SectionLabel>
      </View>
          {summary.length === 0 ? (
            <Text style={styles.muted}>Nothing filled in yet.</Text>
          ) : (
            summary.map((row) => (
              <View key={row.label} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{row.label}</Text>
                <Text style={styles.summaryValue} numberOfLines={2}>{row.value}</Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
      {!busy ? bottomNav : (
        <View style={styles.bottomNav}>
          <Button label="Cancel" variant="ghost" disabled onPress={() => {}} style={styles.navBtn} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: theme.bg, padding: theme.spacing, paddingTop: 20 },
  webShell: { flex: 1, backgroundColor: theme.bg, padding: theme.spacing, paddingTop: 20 },
  webRow: { flexDirection: "row", gap: 20, maxWidth: 1100, width: "100%", alignSelf: "center" },
  webLeft: { width: 280, flexShrink: 0 },
  webCenter: { flex: 1 },
  webCenterInner: { paddingBottom: 24 },
  webRight: { width: 280, flexShrink: 0 },
  mobileScroll: { flex: 1 },
  mobileInner: { paddingBottom: 24 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center",
  },
  backPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 4 },
  backText: { fontFamily: theme.font.sansMedium, fontSize: 14, color: theme.text },
  topBarTitle: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  topBarName: { fontFamily: theme.font.serifSemi, fontSize: 18, color: theme.text },
  topBarCat: { fontFamily: theme.font.monoMedium, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: theme.muted },
  topBarProgress: { width: 180 },
  topBarPct: { fontFamily: theme.font.monoMedium, fontSize: 11, color: theme.muted, marginTop: 4, textAlign: "right" },

  overviewCard: { marginBottom: 0 },
  stepsHeader: { marginTop: 16, marginBottom: 10 },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: theme.radiusSm,
    marginBottom: 4,
  },
  stepItemActive: { backgroundColor: theme.surface2 },
  stepItemText: { flex: 1, fontFamily: theme.font.sans, fontSize: 14, color: theme.muted },
  stepItemTextActive: { fontFamily: theme.font.sansMedium, color: theme.text },

  fieldsCard: { marginBottom: 0 },
  fieldsTitle: { marginBottom: 4 },
  fieldsHelper: { fontFamily: theme.font.sans, fontSize: 13, color: theme.muted, marginBottom: 12 },

  helpCard: { marginBottom: 0 },
  helpHeader: { marginTop: 16, marginBottom: 8 },
  bodyText: { fontFamily: theme.font.sans, fontSize: 14, color: theme.text, lineHeight: 20 },
  metaRow: { flexDirection: "row", marginTop: 10, gap: 12 },
  metaLabel: { fontFamily: theme.font.monoMedium, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: theme.muted, width: 78 },
  metaValue: { flex: 1, fontFamily: theme.font.sans, fontSize: 14, color: theme.text },

  summaryRow: { marginBottom: 8 },
  summaryLabel: { fontFamily: theme.font.monoMedium, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: theme.muted },
  summaryValue: { fontFamily: theme.font.sans, fontSize: 14, color: theme.text },

  genInner: { alignItems: "center", paddingVertical: 28 },
  genTitle: { marginTop: 12, marginBottom: 16 },
  genSub: { fontFamily: theme.font.sans, fontSize: 13, color: theme.muted, marginTop: 12 },

  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center",
  },
  navBtn: { flex: 1 },

  centerCard: { alignItems: "center", maxWidth: 420, alignSelf: "center", marginTop: 40 },
  unknownTitle: { marginTop: 12, marginBottom: 6 },
  unknownActions: { marginTop: 18 },
  muted: { fontFamily: theme.font.sans, fontSize: 14, color: theme.muted },
});
