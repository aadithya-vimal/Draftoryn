import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Button, Heading, theme } from "./primitives";
import { Icon } from "./components";
import { saveOnboardingProgress, type OnboardingData } from "../data/onboarding";
import type { AppUser } from "../auth/clerk";
import { useRouter } from "expo-router";

export type PersonaId = "cybersecurity_professional" | "client" | "technical_professional";

interface DisciplineOption {
  id: string;
  label: string;
  desc: string;
  starterDoc: string;
  starterLabel: string;
}

const PERSONAS: Array<{
  id: PersonaId;
  label: string;
  roleTitle: string;
  eyebrow: string;
  description: string;
  badge: string;
  disciplines: DisciplineOption[];
}> = [
  {
    id: "cybersecurity_professional",
    label: "I'm a Cybersecurity Professional",
    roleTitle: "Cybersecurity Lead / Tester",
    eyebrow: "PENTESTERS // DFIR // GRC // ARCHITECTS",
    description: "Conducting offensive engagements, incident response, threat actor tracking, system architectures, and enterprise cyber risk assessments.",
    badge: "6 DISCIPLINES // 30 SPECIFICATIONS",
    disciplines: [
      {
        id: "offensive_security",
        label: "Offensive Security & Pentesting",
        desc: "Rules of Engagement, Penetration Testing Agreements, Test Plans, and Red Team Assessment Reports.",
        starterDoc: "pentest_agreement",
        starterLabel: "Penetration Testing Agreement / Authorization",
      },
      {
        id: "incident_response_dfir",
        label: "Incident Response & DFIR",
        desc: "Incident Response Plans, containment playbooks, forensic investigations, and malware analysis.",
        starterDoc: "incident_plan",
        starterLabel: "Incident Response Plan",
      },
      {
        id: "threat_intelligence",
        label: "Threat Intelligence & Hunting",
        desc: "Threat Actor Profiles, tactical campaign briefs, threat assessment reports, and IOC dossiers.",
        starterDoc: "threat_intel_report",
        starterLabel: "Threat Intelligence Report",
      },
      {
        id: "security_architecture_engineering",
        label: "Security Architecture & Engineering",
        desc: "Threat modeling (STRIDE), security architecture blueprints, cloud, and application security assessments.",
        starterDoc: "threat_model",
        starterLabel: "Threat Model",
      },
      {
        id: "risk_governance",
        label: "Risk, Governance & Compliance",
        desc: "Cybersecurity risk assessments, enterprise risk registers, vendor reviews, and risk acceptance waivers.",
        starterDoc: "risk_assessment",
        starterLabel: "Cybersecurity Risk Assessment",
      },
      {
        id: "resilience",
        label: "Resilience & Business Continuity",
        desc: "Business Impact Analyses (BIA), disaster recovery plans, and cyber incident recovery playbooks.",
        starterDoc: "bia",
        starterLabel: "Business Impact Analysis (BIA)",
      },
    ],
  },
  {
    id: "client",
    label: "I'm a Client / Commissioning Organization",
    roleTitle: "Security Buyer / Client Representative",
    eyebrow: "ORGANIZATIONS // ASSESSMENTS // GOVERNANCE",
    description: "Commissioning independent security assessments, defining scope & authorization, reviewing deliverable reports, and managing compliance.",
    badge: "AUTHORIZATIONS // DELIVERABLES // AUDITS",
    disciplines: [
      {
        id: "client_authorizations",
        label: "Commissioning & Authorizations",
        desc: "Legally binding Penetration Testing Agreements and Rules of Engagement to authorize security assessments.",
        starterDoc: "pentest_agreement",
        starterLabel: "Penetration Testing Agreement / Authorization",
      },
      {
        id: "client_deliverables",
        label: "Reviewing Assessment Deliverables",
        desc: "Standardized structure for reviewing Red Team, Penetration Test, and Vulnerability Assessment deliverables.",
        starterDoc: "pentest_report",
        starterLabel: "Penetration Testing Report",
      },
      {
        id: "client_governance",
        label: "Governance & Third-Party Oversight",
        desc: "Third-party vendor risk assessments, compliance verification, and enterprise risk acceptance tracking.",
        starterDoc: "third_party_assessment",
        starterLabel: "Third-Party Security Assessment",
      },
    ],
  },
  {
    id: "technical_professional",
    label: "I'm an Engineer / Technical Architect",
    roleTitle: "Systems / Security Engineer",
    eyebrow: "SYSTEM DESIGN // SPECIFICATIONS // CLOUD",
    description: "Designing resilient systems, conducting threat modeling, defining cloud security controls, and preparing technical specifications.",
    badge: "SPECIFICATIONS // ARCHITECTURE // THREAT MODELS",
    disciplines: [
      {
        id: "eng_threat_modeling",
        label: "Threat Modeling & STRIDE Analysis",
        desc: "System decomposition, threat enumeration, attack surface analysis, and countermeasure specifications.",
        starterDoc: "threat_model",
        starterLabel: "Threat Model",
      },
      {
        id: "eng_architecture",
        label: "Security Architecture Blueprint",
        desc: "End-to-end security architecture specifications, network boundary definitions, and IAM models.",
        starterDoc: "security_architecture",
        starterLabel: "Security Architecture Document",
      },
      {
        id: "eng_cloud",
        label: "Cloud & Application Security",
        desc: "Cloud workload posture specifications and application security review documentation.",
        starterDoc: "cloud_assessment",
        starterLabel: "Cloud Security Assessment",
      },
    ],
  },
];

export function OnboardingFlow({
  open,
  user,
  initialData,
  onComplete,
}: {
  open: boolean;
  user: AppUser;
  initialData?: OnboardingData;
  onComplete: () => void;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Step state (1 to 5)
  const [step, setStep] = useState(1);
  const [personaId, setPersonaId] = useState<PersonaId>(
    (initialData?.persona as PersonaId) || "cybersecurity_professional"
  );
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>("offensive_security");
  const [selectedStarterDoc, setSelectedStarterDoc] = useState<string>("pentest_agreement");
  const [workspaceName, setWorkspaceName] = useState(
    initialData?.workspaceName || (user.name ? `${user.name.split(" ")[0]}'s Workspace` : "Primary Security Workspace")
  );
  const [organizationName, setOrganizationName] = useState(
    initialData?.organizationName || ""
  );
  const [operatorName, setOperatorName] = useState(
    initialData?.representativeName || user.name || ""
  );
  const [defaultExportFormat, setDefaultExportFormat] = useState<string>("pdf");
  const [saving, setSaving] = useState(false);

  const currentPersona = PERSONAS.find((p) => p.id === personaId) || PERSONAS[0]!;
  const currentDiscipline =
    currentPersona.disciplines.find((d) => d.id === selectedDisciplineId) || currentPersona.disciplines[0]!;

  const handlePersonaSelect = (id: PersonaId) => {
    setPersonaId(id);
    const p = PERSONAS.find((item) => item.id === id) || PERSONAS[0]!;
    if (p.disciplines[0]) {
      setSelectedDisciplineId(p.disciplines[0].id);
      setSelectedStarterDoc(p.disciplines[0].starterDoc);
    }
  };

  const handleDisciplineSelect = (disc: DisciplineOption) => {
    setSelectedDisciplineId(disc.id);
    setSelectedStarterDoc(disc.starterDoc);
  };

  const handleFinish = async (navigateToDoc: boolean = false) => {
    setSaving(true);
    const finalData: OnboardingData = {
      persona: personaId,
      role: currentPersona.roleTitle,
      focusAreas: [selectedDisciplineId],
      firstDocumentDef: selectedStarterDoc,
      organizationName,
      representativeName: operatorName,
      workspaceName,
      defaultExportFormat,
    };

    await saveOnboardingProgress(user, {
      completed: true,
      step: 5,
      role: currentPersona.roleTitle,
      persona: personaId,
      workspaceName,
      organizationName,
      representativeName: operatorName,
      defaultExportFormat,
      onboardingData: finalData,
    });

    setSaving(false);
    onComplete();

    if (navigateToDoc && selectedStarterDoc) {
      router.push(`/document/new?def=${selectedStarterDoc}`);
    }
  };

  if (!open) return null;

  return (
    <Modal visible={open} animationType="fade" transparent={false}>
      <View style={styles.screen}>
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <View style={styles.statusIndicator} />
            <Text style={styles.systemTag}>SYSTEM // WORKSPACE INITIALIZATION</Text>
          </View>
          <View style={styles.topBarRight}>
            <Text style={styles.stepCounter}>STEP {String(step).padStart(2, "0")} / 05</Text>
          </View>
        </View>

        {/* Step Progress Hairline */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(step / 5) * 100}%` }]} />
        </View>

        {/* Main Content Area */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[styles.scrollContent, isMobile ? styles.scrollContentMobile : styles.scrollContentDesktop]}
        >
          {/* ========================================================================= */}
          {/* STEP 1: WELCOME & SYSTEM SPECIFICATION                                   */}
          {/* ========================================================================= */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.eyebrow}>CONFIGURATION // INITIALIZATION</Text>
              <Heading level={1} style={styles.heroHeadline}>
                Initialize your professional document studio.
              </Heading>
              <Text style={styles.leadParagraph}>
                Draftoryn generates structured, authoritative technical and security specifications
                with typographic discipline, verified schemas, and zero placeholder fluff.
              </Text>

              {/* Specimen Terminal Card */}
              <View style={styles.terminalCard}>
                <View style={styles.terminalHeader}>
                  <View style={styles.terminalDot} />
                  <Text style={styles.terminalTitle}>NEON RELATIONAL BACKEND // ACTIVE</Text>
                </View>
                <View style={styles.terminalBody}>
                  <View style={styles.specimenRow}>
                    <Text style={styles.specimenKey}>AUTHENTICATION</Text>
                    <Text style={styles.specimenVal}>Clerk Verified ({user.email || user.userId})</Text>
                  </View>
                  <View style={styles.specimenRow}>
                    <Text style={styles.specimenKey}>PERSISTENCE</Text>
                    <Text style={styles.specimenVal}>Neon PostgreSQL [Source of Truth]</Text>
                  </View>
                  <View style={styles.specimenRow}>
                    <Text style={styles.specimenKey}>DOCUMENT CATALOG</Text>
                    <Text style={styles.specimenVal}>30 Real Technical & Security Specifications</Text>
                  </View>
                  <View style={styles.specimenRow}>
                    <Text style={styles.specimenKey}>DESIGN DISCIPLINE</Text>
                    <Text style={styles.specimenVal}>Technical Editorial • Hairline Grids • Non-AI</Text>
                  </View>
                </View>
              </View>

              <View style={styles.actionRow}>
                <Button
                  label="Begin Workspace Setup →"
                  onPress={() => setStep(2)}
                  style={styles.primaryActionBtn}
                />
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: PERSONA / INTENT IDENTIFICATION                                   */}
          {/* ========================================================================= */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.eyebrow}>IDENTITY // OPERATIONAL CONTEXT</Text>
              <Heading level={1} style={styles.stepHeadline}>
                How will you use Draftoryn?
              </Heading>
              <Text style={styles.stepSubtitle}>
                Select your primary role. This configures your document prioritization, header autofill
                dictionaries, and default technical scopes.
              </Text>

              <View style={styles.cardGrid}>
                {PERSONAS.map((p) => {
                  const active = p.id === personaId;
                  return (
                    <Pressable
                      key={p.id}
                      style={[styles.personaCard, active && styles.personaCardActive]}
                      onPress={() => handlePersonaSelect(p.id)}
                    >
                      <View style={styles.personaTopRow}>
                        <Text style={[styles.personaEyebrow, active && styles.personaEyebrowActive]}>
                          {p.eyebrow}
                        </Text>
                        <View style={[styles.radioCircle, active && styles.radioCircleActive]}>
                          {active && <View style={styles.radioInner} />}
                        </View>
                      </View>
                      <Text style={styles.personaTitle}>{p.label}</Text>
                      <Text style={styles.personaDesc}>{p.description}</Text>
                      <View style={styles.personaBadge}>
                        <Text style={styles.personaBadgeText}>{p.badge}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.navRow}>
                <Button label="← Back" variant="secondary" onPress={() => setStep(1)} />
                <Button
                  label="Continue to Discipline Selection →"
                  onPress={() => setStep(3)}
                  style={styles.primaryActionBtn}
                />
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: DISCIPLINE / PRIMARY FOCUS                                        */}
          {/* ========================================================================= */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.eyebrow}>DISCIPLINE // FOCUS AREA</Text>
              <Heading level={1} style={styles.stepHeadline}>
                What best describes your primary work?
              </Heading>
              <Text style={styles.stepSubtitle}>
                Choose your primary focus area within {currentPersona.label.toLowerCase()}.
              </Text>

              <View style={styles.cardGrid}>
                {currentPersona.disciplines.map((d) => {
                  const active = d.id === selectedDisciplineId;
                  return (
                    <Pressable
                      key={d.id}
                      style={[styles.disciplineCard, active && styles.disciplineCardActive]}
                      onPress={() => handleDisciplineSelect(d)}
                    >
                      <View style={styles.disciplineTop}>
                        <Text style={[styles.disciplineTitle, active && styles.disciplineTitleActive]}>
                          {d.label}
                        </Text>
                        <View style={[styles.radioCircle, active && styles.radioCircleActive]}>
                          {active && <View style={styles.radioInner} />}
                        </View>
                      </View>
                      <Text style={styles.disciplineDesc}>{d.desc}</Text>
                      <View style={styles.starterPreviewTag}>
                        <Text style={styles.starterPreviewLabel}>DEFAULT SPEC:</Text>
                        <Text style={styles.starterPreviewValue} numberOfLines={1}>{d.starterLabel}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.navRow}>
                <Button label="← Back" variant="secondary" onPress={() => setStep(2)} />
                <Button
                  label="Configure Workspace Details →"
                  onPress={() => setStep(4)}
                  style={styles.primaryActionBtn}
                />
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: WORKSPACE & PROFILE CONFIGURATION                                */}
          {/* ========================================================================= */}
          {step === 4 && (
            <View style={styles.stepContainer}>
              <Text style={styles.eyebrow}>SYSTEM CONFIGURATION // DEFAULTS</Text>
              <Heading level={1} style={styles.stepHeadline}>
                Set up your workspace and profile defaults.
              </Heading>
              <Text style={styles.stepSubtitle}>
                These settings persist to Neon PostgreSQL and automatically populate your document
                header blocks and metadata sections.
              </Text>

              <View style={styles.formPanel}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>WORKSPACE NAME</Text>
                  <TextInput
                    style={styles.formInput}
                    value={workspaceName}
                    onChangeText={setWorkspaceName}
                    placeholder="e.g. Primary Security Operations"
                    placeholderTextColor={theme.muted}
                  />
                  <Text style={styles.formHint}>Maps directly to your Neon default workspace record.</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {personaId === "client" ? "ORGANIZATION / COMPANY NAME" : "TESTING FIRM / PRACTICE NAME"}
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    value={organizationName}
                    onChangeText={setOrganizationName}
                    placeholder={personaId === "client" ? "e.g. Acme Corporation" : "e.g. Apex Cyber Labs LLC"}
                    placeholderTextColor={theme.muted}
                  />
                  <Text style={styles.formHint}>
                    Autofills {personaId === "client" ? "client organization" : "testing organization"} across all 30 document definitions.
                  </Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {personaId === "client" ? "CLIENT REPRESENTATIVE NAME" : "LEAD OPERATOR / TESTER NAME"}
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    value={operatorName}
                    onChangeText={setOperatorName}
                    placeholder="e.g. Jane Doe, CISSP"
                    placeholderTextColor={theme.muted}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>DEFAULT EXPORT FORMAT</Text>
                  <View style={styles.formatRow}>
                    {(["pdf", "markdown", "docx", "html"] as const).map((fmt) => {
                      const active = defaultExportFormat === fmt;
                      return (
                        <Pressable
                          key={fmt}
                          style={[styles.formatBtn, active && styles.formatBtnActive]}
                          onPress={() => setDefaultExportFormat(fmt)}
                        >
                          <Text style={[styles.formatBtnText, active && styles.formatBtnTextActive]}>
                            {fmt.toUpperCase()}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>

              <View style={styles.navRow}>
                <Button label="← Back" variant="secondary" onPress={() => setStep(3)} />
                <Button
                  label="Review & Initialize Workspace →"
                  onPress={() => setStep(5)}
                  style={styles.primaryActionBtn}
                />
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: PROVISIONING CONFIRMATION & LAUNCH                                */}
          {/* ========================================================================= */}
          {step === 5 && (
            <View style={styles.stepContainer}>
              <Text style={styles.eyebrow}>READY // INITIALIZATION COMPLETE</Text>
              <Heading level={1} style={styles.stepHeadline}>
                Your workspace is configured.
              </Heading>
              <Text style={styles.stepSubtitle}>
                Your persona, default workspace, and autofill profiles are ready to be written to Neon PostgreSQL.
              </Text>

              {/* Summary Specimen */}
              <View style={styles.summaryPanel}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>WORKSPACE</Text>
                  <Text style={styles.summaryValue}>{workspaceName || "Primary Workspace"}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>OPERATIONAL PERSONA</Text>
                  <Text style={styles.summaryValue}>{currentPersona.label}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>PRIMARY DISCIPLINE</Text>
                  <Text style={styles.summaryValue}>{currentDiscipline.label}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>ORGANIZATION</Text>
                  <Text style={styles.summaryValue}>{organizationName || "Independent Practitioner"}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>RECOMMENDED STARTER SPEC</Text>
                  <Text style={styles.summaryValueHighlight}>{currentDiscipline.starterLabel}</Text>
                </View>
              </View>

              <View style={styles.completionActionRow}>
                <Button
                  label={saving ? "Provisioning..." : "Create First Document →"}
                  disabled={saving}
                  onPress={() => handleFinish(true)}
                  style={styles.primaryActionBtn}
                />
                <Button
                  label="Go to Workspace Dashboard"
                  variant="secondary"
                  disabled={saving}
                  onPress={() => handleFinish(false)}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  topBar: {
    height: 52,
    borderBottomWidth: 1,
    borderColor: theme.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    backgroundColor: theme.surface,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.ok,
  },
  systemTag: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1.5,
    color: theme.muted,
  },
  topBarRight: {},
  stepCounter: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1.5,
    color: theme.accent,
  },
  progressTrack: {
    height: 2,
    backgroundColor: theme.surface2,
    width: "100%",
  },
  progressFill: {
    height: 2,
    backgroundColor: theme.accent,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignSelf: "center",
    width: "100%",
  },
  scrollContentMobile: {
    maxWidth: "100%",
  },
  scrollContentDesktop: {
    maxWidth: 780,
  },
  stepContainer: {
    gap: 16,
  },
  eyebrow: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 2.2,
    color: theme.accent,
    textTransform: "uppercase",
  },
  heroHeadline: {
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: -1,
    color: theme.text,
  },
  stepHeadline: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
    color: theme.text,
  },
  leadParagraph: {
    fontFamily: theme.font.sans,
    fontSize: 16,
    lineHeight: 24,
    color: theme.mutedLight,
  },
  stepSubtitle: {
    fontFamily: theme.font.sans,
    fontSize: 15,
    lineHeight: 22,
    color: theme.muted,
    marginBottom: 8,
  },
  terminalCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    overflow: "hidden",
    marginVertical: 14,
  },
  terminalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: theme.surface2,
    borderBottomWidth: 1,
    borderColor: theme.border,
  },
  terminalDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: theme.accent,
  },
  terminalTitle: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: theme.mutedLight,
  },
  terminalBody: {
    padding: 18,
    gap: 12,
  },
  specimenRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  specimenKey: {
    fontFamily: theme.font.mono,
    fontSize: 11,
    letterSpacing: 1.2,
    color: theme.muted,
  },
  specimenVal: {
    fontFamily: theme.font.monoMedium,
    fontSize: 12,
    color: theme.text,
  },
  cardGrid: {
    gap: 12,
    marginVertical: 12,
  },
  personaCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: 20,
    gap: 8,
  },
  personaCardActive: {
    borderColor: theme.accent,
    backgroundColor: theme.surface2,
  },
  personaTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  personaEyebrow: {
    fontFamily: theme.font.mono,
    fontSize: 9.5,
    letterSpacing: 1.5,
    color: theme.muted,
  },
  personaEyebrowActive: {
    color: theme.accent,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: theme.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: {
    borderColor: theme.accent,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.accent,
  },
  personaTitle: {
    fontFamily: theme.font.sansBold,
    fontSize: 18,
    color: theme.text,
  },
  personaDesc: {
    fontFamily: theme.font.sans,
    fontSize: 13.5,
    lineHeight: 19,
    color: theme.mutedLight,
  },
  personaBadge: {
    alignSelf: "flex-start",
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 3,
    marginTop: 4,
  },
  personaBadgeText: {
    fontFamily: theme.font.mono,
    fontSize: 9.5,
    letterSpacing: 1,
    color: theme.muted,
  },
  disciplineCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: 16,
    gap: 6,
  },
  disciplineCardActive: {
    borderColor: theme.accent,
    backgroundColor: theme.surface2,
  },
  disciplineTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  disciplineTitle: {
    fontFamily: theme.font.sansBold,
    fontSize: 16,
    color: theme.text,
  },
  disciplineTitleActive: {
    color: theme.text,
  },
  disciplineDesc: {
    fontFamily: theme.font.sans,
    fontSize: 13,
    lineHeight: 18,
    color: theme.muted,
  },
  starterPreviewTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: theme.border,
  },
  starterPreviewLabel: {
    fontFamily: theme.font.mono,
    fontSize: 9,
    letterSpacing: 1,
    color: theme.muted,
  },
  starterPreviewValue: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    color: theme.accent,
    flex: 1,
  },
  formPanel: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: 24,
    gap: 18,
    marginVertical: 12,
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10.5,
    letterSpacing: 1.5,
    color: theme.mutedLight,
  },
  formInput: {
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.text,
    fontFamily: theme.font.sans,
  },
  formHint: {
    fontFamily: theme.font.sans,
    fontSize: 11.5,
    color: theme.muted,
  },
  formatRow: {
    flexDirection: "row",
    gap: 8,
  },
  formatBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusSm,
    backgroundColor: theme.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  formatBtnActive: {
    borderColor: theme.accent,
    backgroundColor: theme.accentSubtle,
  },
  formatBtnText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1,
    color: theme.muted,
  },
  formatBtnTextActive: {
    color: theme.accent,
  },
  summaryPanel: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radius,
    padding: 20,
    gap: 12,
    marginVertical: 16,
  },
  summaryItem: {
    gap: 4,
  },
  summaryLabel: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    color: theme.muted,
  },
  summaryValue: {
    fontFamily: theme.font.sansMedium,
    fontSize: 14,
    color: theme.text,
  },
  summaryValueHighlight: {
    fontFamily: theme.font.sansBold,
    fontSize: 15,
    color: theme.accent,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: theme.border,
  },
  actionRow: {
    marginTop: 20,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    gap: 12,
  },
  completionActionRow: {
    gap: 12,
    marginTop: 24,
  },
  primaryActionBtn: {
    flex: 1,
  },
});
