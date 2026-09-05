import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
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
  Badge,
} from "../../src/ui/components";
import { CATEGORY_VISUALS } from "../../src/ui/categories";
import {
  FieldRenderer,
  validateEmail,
  validatePhone,
  validateDate,
  isEmailField,
  isPhoneField,
  isDateField,
} from "../../src/ui/FieldRenderer";
import { getDefinition } from "../../src/engine/definitions/catalog";
import {
  getUserSettings,
  autofillFromProfiles,
  DEFAULT_USER_SETTINGS,
  type UserSettings,
} from "../../src/lib/userSettings";
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

function getStepTitle(fields: FieldDef[], index: number, total: number): string {
  if (!fields || fields.length === 0) return `Step ${index + 1}`;
  const ids = fields.map((f) => f.id);

  if (ids.some((id) => id.startsWith("client"))) {
    return "Client Organization";
  }
  if (ids.some((id) => id.startsWith("provider"))) {
    return "Assessing Provider";
  }
  if (ids.includes("objective") || ids.includes("inScope") || ids.includes("outOfScope")) {
    return "Scope & Objectives";
  }
  if (
    ids.includes("startDate") ||
    ids.includes("endDate") ||
    ids.includes("windows") ||
    ids.includes("authorizedBy") ||
    ids.includes("authReference")
  ) {
    return "Schedule & Authorization";
  }
  if (ids.includes("constraints") || ids.includes("methodology") || ids.includes("authDate")) {
    return "Rules & Methodology";
  }
  if (
    ids.includes("deliverables") ||
    ids.includes("reportAudience") ||
    ids.includes("evidence") ||
    ids.includes("assumptions")
  ) {
    return "Deliverables & Reporting";
  }

  const concepts = new Set(fields.map((f) => f.mapsTo).filter(Boolean));
  if (concepts.has("client")) return "Client Details";
  if (concepts.has("provider")) return "Provider Details";
  if (concepts.has("scope")) return "Target Scope";
  if (concepts.has("schedule")) return "Timeline";
  if (concepts.has("authorization")) return "Authorization";
  if (concepts.has("constraints")) return "Safety Constraints";
  if (concepts.has("methodology")) return "Methodology";
  if (concepts.has("reporting")) return "Deliverables";
  if (concepts.has("assumptions")) return "Assumptions";

  const first = fields[0]?.label ?? `Step ${index + 1}`;
  return first.length > 24 ? `${first.slice(0, 22)}…` : first;
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
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;

  const defId = normalizeParam(params.defId) || normalizeParam(params.def);
  const def = defId ? getDefinition(defId) : undefined;

  const [source, setSource] = useState<Record<string, unknown>>({});
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);

  useEffect(() => {
    getUserSettings().then(setUserSettings);
  }, []);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [generatingWithAi, setGeneratingWithAi] = useState(false);
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

  const totalAllFields = def ? def.fields.length : 0;
  const totalAllFilled = def ? def.fields.filter((f) => !isEmptyValue(source[f.id])).length : 0;
  const totalAllRequired = def ? def.fields.filter((f) => f.required).length : 0;
  const totalAllFilledRequired = def ? def.fields.filter((f) => f.required && !isEmptyValue(source[f.id])).length : 0;
  const completionRatio = totalAllFields > 0 ? totalAllFilled / totalAllFields : 1;
  const completionPct = Math.round(completionRatio * 100);

  const stepsMeta = useMemo(() => {
    return steps.map((group, i) => {
      const required = group.filter((f) => f.required);
      const filledRequired = required.filter((f) => !isEmptyValue(source[f.id]));
      const total = group.length;
      const filled = group.filter((f) => !isEmptyValue(source[f.id])).length;
      const isComplete = required.length > 0 ? filledRequired.length === required.length : filled > 0;
      const missingRequired = required.length - filledRequired.length;
      const title = getStepTitle(group, i, totalSteps);
      return {
        index: i,
        title,
        group,
        total,
        filled,
        requiredCount: required.length,
        filledRequired: filledRequired.length,
        missingRequired,
        isComplete,
      };
    });
  }, [steps, source, totalSteps]);

  const completedStepsCount = stepsMeta.filter((s) => s.isComplete).length;
  const currentStepMeta = stepsMeta[Math.min(step, totalSteps - 1)];

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
    // 1. Check required fields
    const missing = fields.find((f) => f.required === true && isEmptyValue(source[f.id]));
    if (missing) {
      setError(`Please fill required field: "${missing.label}"`);
      return false;
    }

    // 2. Validate email fields
    for (const f of fields) {
      const val = source[f.id];
      if (typeof val === "string" && val.trim().length > 0 && isEmailField(f)) {
        if (!validateEmail(val)) {
          setError(`Please enter a valid email address for "${f.label}"`);
          return false;
        }
      }
    }

    // 3. Validate phone fields
    for (const f of fields) {
      const val = source[f.id];
      if (typeof val === "string" && val.trim().length > 0 && isPhoneField(f)) {
        if (!validatePhone(val)) {
          setError(`Please enter a valid phone number for "${f.label}"`);
          return false;
        }
      }
    }

    // 4. Validate date fields
    for (const f of fields) {
      const val = source[f.id];
      if (typeof val === "string" && val.trim().length > 0 && isDateField(f)) {
        if (!validateDate(val)) {
          setError(`Please enter a valid date in YYYY-MM-DD format for "${f.label}"`);
          return false;
        }
      }
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

  const onGenerate = async (useAi = false) => {
    if (!validateStep(currentStepFields)) return;

    if (useAi) {
      // Require user context before triggering real AI inference
      const filledCount = def ? def.fields.filter((f) => !isEmptyValue(source[f.id])).length : 0;
      if (filledCount === 0) {
        setError("Please enter your organization or engagement context before populating with AI.");
        return;
      }
    }

    setBusy(true);
    setGeneratingWithAi(useAi);
    setError("");
    try {
      const gen: GeneratedDocument = await generateDocumentClient(def.id, source, {
        useAi,
        getToken: user.getToken,
      });
      const version: DocumentVersion = createVersion(
        1,
        gen.title,
        source,
        gen.model,
        gen.sections,
        "ready" as DocumentStatus,
        useAi ? "AI synthesized draft" : "Manual structural draft",
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
      setGeneratingWithAi(false);
    }
  };

  const summary = summarizeSource(def.fields, source);

  // Desktop Top Bar
  const desktopTopBar = (
    <View style={styles.desktopTopBar}>
      <TouchableOpacity style={styles.backPill} onPress={goBack} accessibilityRole="button" accessibilityLabel="Back">
        <Icon name="ArrowLeft" size={18} color={theme.text} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
      <View style={styles.desktopTopBarTitleWrap}>
        <Icon name={visual.icon} size={20} color={visual.accent} />
        <Text style={styles.topBarName} numberOfLines={1}>{def.name}</Text>
        <View style={styles.topBarCatBadge}>
          <Text style={styles.topBarCat}>{visual.label}</Text>
        </View>
      </View>
      <View style={styles.topBarProgress}>
        <ProgressBar value={completionRatio} height={6} />
        <Text style={styles.topBarPct}>
          {completionPct}% filled · Step {step + 1} of {totalSteps}
        </Text>
      </View>
    </View>
  );

  // Mobile Top Bar
  const mobileTopBar = (
    <View style={styles.mobileTopBar}>
      <View style={styles.mobileTopBarNavRow}>
        <TouchableOpacity style={styles.backPill} onPress={goBack} accessibilityRole="button" accessibilityLabel="Back">
          <Icon name="ArrowLeft" size={16} color={theme.text} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.topBarCatBadge}>
          <Icon name={visual.icon} size={12} color={visual.accent} />
          <Text style={styles.topBarCat}>{visual.label}</Text>
        </View>
      </View>

      <View style={styles.mobileTopBarTitleRow}>
        <Text style={styles.mobileDocTitle} numberOfLines={2}>
          {def.name}
        </Text>
      </View>

      <View style={styles.mobileProgressBarWrap}>
        <ProgressBar value={completionRatio} height={5} />
        <View style={styles.mobileProgressLabels}>
          <Text style={styles.mobileProgressPct}>{completionPct}% complete</Text>
          <Text style={styles.mobileProgressStep}>Step {step + 1} of {totalSteps}</Text>
        </View>
      </View>
    </View>
  );

  // Interactive Progress & Step Selector Card
  const progressSection = (
    <View style={styles.progressSection}>
      <View style={styles.progressHeaderRow}>
        <Text style={styles.progressHeaderTitle}>YOUR PROGRESS</Text>
        <Badge tone={completionPct === 100 ? "ok" : completionPct > 0 ? "accent" : "neutral"}>
          {`${completionPct}% complete`}
        </Badge>
      </View>
      <ProgressBar value={completionRatio} height={6} style={styles.overviewProgressBar} />
      <Text style={styles.progressSubtitle}>
        {totalAllFilled} of {totalAllFields} fields filled · {completedStepsCount} of {totalSteps} steps ready
      </Text>
      <View style={styles.stepsList}>
        {stepsMeta.map((sm, i) => {
          const active = i === step;
          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.stepItem,
                active && styles.stepItemActive,
                sm.isComplete && styles.stepItemComplete,
              ]}
              onPress={() => goToStep(i)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              {active && <View style={styles.stepActiveBar} />}
              <View
                style={[
                  styles.stepBadge,
                  active && styles.stepBadgeActive,
                  sm.isComplete && styles.stepBadgeComplete,
                ]}
              >
                {sm.isComplete ? (
                  <Icon name="Check" size={12} color="#FFFFFF" strokeWidth={2.6} />
                ) : (
                  <Text style={[styles.stepBadgeNum, active && styles.stepBadgeNumActive]}>
                    {i + 1}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepItemTitle, active && styles.stepItemTitleActive]} numberOfLines={1}>
                  {sm.title}
                </Text>
                <Text style={styles.stepItemMeta}>
                  {sm.filled} of {sm.total} fields
                  {sm.missingRequired > 0 ? ` (${sm.missingRequired} required)` : ""}
                </Text>
              </View>
              {active ? <View style={styles.activeDot} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const overviewCard = (
    <Card style={styles.overviewCard}>
      <SectionLabel>About this document</SectionLabel>
      <Text style={styles.bodyText}>{def.description}</Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Audience</Text>
        <Text style={styles.metaValue}>{def.intendedAudience ?? def.audience ?? "—"}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Purpose</Text>
        <Text style={styles.metaValue}>{def.purpose}</Text>
      </View>
      {progressSection}
    </Card>
  );

  const fieldsCard = (
    <Card accentTop style={styles.fieldsCard}>
      <View style={styles.fieldsHeaderRow}>
        <Heading level={3} style={styles.fieldsTitle}>
          {currentStepMeta ? currentStepMeta.title : (isLastStep ? "Final details" : `Step ${step + 1}`)}
        </Heading>
        <Badge tone={currentStepMeta?.isComplete ? "ok" : "neutral"}>
          {`Step ${step + 1} of ${totalSteps}`}
        </Badge>
      </View>
      <Text style={styles.fieldsHelper}>
        {currentStepFields.length > 0
          ? `Complete the fields below (${currentStepMeta?.filled ?? 0}/${currentStepMeta?.total ?? 0} filled). Required fields must be completed.`
          : "This template has no entry fields — you can generate it directly."}
      </Text>
            {/* Quick Autofill Profiles Banner */}
      <View style={styles.autofillBanner}>
        <View style={styles.autofillHeader}>
          <Text style={styles.autofillTitle}>⚡ QUICK AUTOFILL</Text>
          <TouchableOpacity onPress={() => router.push("/(app)/settings")}>
            <Text style={styles.autofillSettingsLink}>Configure Profiles →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.autofillChipsRow}>
          <TouchableOpacity
            style={styles.autofillChip}
            onPress={() => {
              setSource((prev) => autofillFromProfiles(prev, userSettings, "tester"));
              setError("");
            }}
          >
            <Text style={styles.autofillChipText}>+ Tester Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.autofillChip}
            onPress={() => {
              setSource((prev) => autofillFromProfiles(prev, userSettings, "client"));
              setError("");
            }}
          >
            <Text style={styles.autofillChipText}>+ Client Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.autofillChip, styles.autofillChipAccent]}
            onPress={() => {
              setSource((prev) => autofillFromProfiles(prev, userSettings, "all"));
              setError("");
            }}
          >
            <Text style={styles.autofillChipAccentText}>Autofill All</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FieldRenderer fields={currentStepFields} source={source} onChange={change} />
      {error ? <ErrorText message={error} /> : null}

      <View style={styles.formNavRow}>
        <Button
          label="Back"
          variant="secondary"
          disabled={step === 0 || busy}
          onPress={goBack}
          style={styles.navBtn}
        />
        {isLastStep ? (
          <View style={{ flexDirection: "row", gap: 10, flex: 1, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <Button
              label={busy && !generatingWithAi ? "Creating…" : "Create Document"}
              variant="primary"
              disabled={busy}
              onPress={() => onGenerate(false)}
            />
            <Button
              label={busy && generatingWithAi ? "Synthesizing…" : "Populate with AI"}
              variant="secondary"
              disabled={busy}
              onPress={() => onGenerate(true)}
            />
          </View>
        ) : (
          <Button
            label="Continue"
            disabled={busy}
            onPress={goNext}
            style={styles.navBtn}
          />
        )}
      </View>
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
        <ActivityIndicator size="large" color={theme.accent} style={{ marginBottom: 8 }} />
        <Heading level={3} style={styles.genTitle}>
          {generatingWithAi ? "Synthesizing document with AI…" : "Generating your document…"}
        </Heading>
        <ProgressBar indeterminate height={6} />
        <Text style={styles.genSub}>
          {generatingWithAi
            ? "Analyzing context · Generating technical sections · Applying safety guardrails"
            : "Building structure · Embedding inputs · Generating baseline clauses"}
        </Text>
      </View>
    </Card>
  );

  if (isDesktop) {
    return (
      <View style={styles.webShell}>
        {desktopTopBar}
        <View style={styles.webRow}>
          <View style={styles.webLeft}>{overviewCard}</View>
          <ScrollView style={styles.webCenter} contentContainerStyle={styles.webCenterInner}>
            {busy ? generatingCard : fieldsCard}
          </ScrollView>
          <View style={styles.webRight}>{helpCard}</View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mobileShell}>
      {mobileTopBar}
      <ScrollView style={styles.mobileScroll} contentContainerStyle={styles.mobileInner}>
        {busy ? generatingCard : fieldsCard}
        <View style={{ height: 16 }} />
        {overviewCard}
        <View style={{ height: 16 }} />
        {helpCard}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  autofillBanner: {
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderRadius: theme.radiusSm,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.28)",
    padding: 12,
    marginBottom: 16,
  },
  autofillHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  autofillTitle: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1.5,
    color: theme.accent,
  },
  autofillSettingsLink: {
    fontFamily: theme.font.sansMedium,
    fontSize: 12,
    color: theme.accent,
    textDecorationLine: "underline",
  },
  autofillChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  autofillChip: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  autofillChipText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 12.5,
    color: theme.text,
  },
  autofillChipAccent: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  autofillChipAccentText: {
    fontFamily: theme.font.sansMedium,
    fontSize: 12.5,
    color: theme.accentForeground,
  },
  webShell: { flex: 1, backgroundColor: theme.bg, padding: 24, paddingTop: 20 },
  webRow: { flexDirection: "row", gap: 20, maxWidth: 1120, width: "100%", alignSelf: "center" },
  webLeft: { width: 300, flexShrink: 0 },
  webCenter: { flex: 1 },
  webCenterInner: { paddingBottom: 32 },
  webRight: { width: 280, flexShrink: 0 },

  mobileShell: { flex: 1, backgroundColor: theme.bg, padding: 16, paddingTop: 14 },
  mobileScroll: { flex: 1 },
  mobileInner: { paddingBottom: 32 },

  desktopTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 18,
    maxWidth: 1120,
    width: "100%",
    alignSelf: "center",
  },
  desktopTopBarTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  backPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 4, flexShrink: 0 },
  backText: { fontFamily: theme.font.sansMedium, fontSize: 14, color: theme.text },
  topBarName: { fontFamily: theme.font.serifSemi, fontSize: 18, color: theme.text, flexShrink: 1 },
  topBarCatBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.28)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
    flexShrink: 0,
  },
  topBarCat: { fontFamily: theme.font.monoMedium, fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: theme.accent },
  topBarProgress: { width: 220, flexShrink: 0 },
  topBarPct: { fontFamily: theme.font.monoMedium, fontSize: 11, color: theme.muted, marginTop: 4, textAlign: "right" },

  mobileTopBar: {
    marginBottom: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderColor: theme.border,
    paddingBottom: 12,
  },
  mobileTopBarNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mobileTopBarTitleRow: {
    marginTop: 2,
  },
  mobileDocTitle: {
    fontFamily: theme.font.serifSemi,
    fontSize: 20,
    lineHeight: 26,
    color: theme.text,
  },
  mobileProgressBarWrap: {
    marginTop: 6,
  },
  mobileProgressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  mobileProgressPct: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    color: theme.accent,
  },
  mobileProgressStep: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    color: theme.muted,
  },

  overviewCard: { marginBottom: 0 },
  progressSection: { marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderColor: theme.border },
  progressHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8 },
  progressHeaderTitle: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: theme.accent,
  },
  overviewProgressBar: { marginVertical: 6 },
  progressSubtitle: { fontFamily: theme.font.monoMedium, fontSize: 10.5, color: theme.muted, marginTop: 3, marginBottom: 12 },
  stepsList: { gap: 5 },
  stepItem: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: theme.radiusSm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  stepItemActive: { backgroundColor: "rgba(59, 130, 246, 0.12)", borderColor: "rgba(59, 130, 246, 0.28)" },
  stepItemComplete: { backgroundColor: theme.surface },
  stepActiveBar: { position: "absolute", left: 0, top: 5, bottom: 5, width: 3.5, backgroundColor: theme.accent, borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  stepBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: theme.surface2, alignItems: "center", justifyContent: "center" },
  stepBadgeActive: { backgroundColor: theme.accent },
  stepBadgeComplete: { backgroundColor: theme.ok },
  stepBadgeNum: { fontFamily: theme.font.monoMedium, fontSize: 11, color: theme.muted },
  stepBadgeNumActive: { color: theme.accentForeground },
  stepItemTitle: { fontFamily: theme.font.sansMedium, fontSize: 13, color: theme.text },
  stepItemTitleActive: { fontFamily: theme.font.sansSemi, color: theme.accent, fontWeight: "600" },
  stepItemMeta: { fontFamily: theme.font.mono, fontSize: 10, color: theme.muted, marginTop: 2 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.accent },

  fieldsCard: { marginBottom: 0 },
  fieldsHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  fieldsTitle: { marginBottom: 0, flex: 1 },
  fieldsHelper: { fontFamily: theme.font.sans, fontSize: 13, color: theme.muted, marginBottom: 16, marginTop: 6, lineHeight: 18 },

  formNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: theme.border,
  },
  navBtn: { flex: 1 },

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

  centerCard: { alignItems: "center", maxWidth: 420, alignSelf: "center", marginTop: 40 },
  unknownTitle: { marginTop: 12, marginBottom: 6 },
  unknownActions: { marginTop: 18 },
  muted: { fontFamily: theme.font.sans, fontSize: 14, color: theme.muted },
});
