import React, { useState } from "react";
import {
  Image,
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

export type PersonaId = "client" | "cybersecurity_professional" | "technical_professional";

interface SupportedDoc {
  id: string;
  name: string;
  desc: string;
  category: string;
  previewSnippet: string;
}

const PERSONAS: Array<{
  id: PersonaId;
  label: string;
  roleTitle: string;
  description: string;
}> = [
  {
    id: "client",
    label: "I'M A CLIENT",
    roleTitle: "Commissioning Client",
    description: "Commissioning independent assessments, defining rules of engagement, and reviewing professional security deliverables.",
  },
  {
    id: "cybersecurity_professional",
    label: "I'M A CYBERSECURITY PROFESSIONAL",
    roleTitle: "Cybersecurity Lead / Assessor",
    description: "Conducting offensive penetration tests, incident response, threat intelligence briefs, and compliance audits.",
  },
  {
    id: "technical_professional",
    label: "I'M A TECHNICAL PROFESSIONAL",
    roleTitle: "Security / Systems Architect",
    description: "Engineering secure architectures, authoring system threat models, cloud specifications, and design reviews.",
  },
];

const CATEGORIES_LIST = [
  { id: "offensive_security", label: "OFFENSIVE SECURITY", desc: "Rules of Engagement, Penetration Testing Agreements, Test Plans, and Assessment Reports." },
  { id: "incident_response_dfir", label: "INCIDENT RESPONSE / DFIR", desc: "Incident Response Plans, containment playbooks, forensic evidence tracking, and malware analyses." },
  { id: "threat_intelligence", label: "THREAT INTELLIGENCE", desc: "Threat Actor Profiles, threat assessments, campaign tracking dossiers, and tactical intelligence." },
  { id: "security_architecture_engineering", label: "SECURITY ARCHITECTURE / ENGINEERING", desc: "System threat models, architecture blueprints, cloud security specifications, and design reviews." },
  { id: "risk_governance", label: "RISK / GOVERNANCE", desc: "Cybersecurity risk assessments, enterprise risk registers, vendor security evaluations, and risk waivers." },
  { id: "resilience", label: "RESILIENCE", desc: "Business impact analyses, disaster recovery plans, and cyber operational recovery playbooks." },
];

const STARTER_DOCS: Record<string, SupportedDoc[]> = {
  offensive_security: [
    {
      id: "pentest_agreement",
      name: "Penetration Testing Agreement / Authorization",
      category: "Offensive Security",
      desc: "Legally binding testing authorization granting Safe Harbor permissions, target CIDR scopes, and boundary rules.",
      previewSnippet: "1.0 Formal Authorization under CFAA • 2.0 Permitted Target Scope • 3.0 Safe Harbor",
    },
    {
      id: "roe",
      name: "Rules of Engagement (RoE)",
      category: "Offensive Security",
      desc: "Operational guidelines specifying test windows, communication protocols, emergency escalation, and red-lines.",
      previewSnippet: "1.0 Logistics & Schedule • 2.0 Escalation Contacts • 3.0 Sensitive Asset Handling",
    },
    {
      id: "pentest_report",
      name: "Penetration Testing Report",
      category: "Offensive Security",
      desc: "Publication-grade technical assessment report with executive summary, CVSS vulnerability findings, and remediation steps.",
      previewSnippet: "1.0 Executive Summary • 2.0 Assessment Methodology • 3.0 Vulnerability Findings",
    },
  ],
  incident_response_dfir: [
    {
      id: "incident_plan",
      name: "Incident Response Plan",
      category: "Incident Response / DFIR",
      desc: "Enterprise incident management framework with severity classifications, team rosters, and containment procedures.",
      previewSnippet: "1.0 Classification Matrix • 2.0 Triage Protocols • 3.0 Containment & Sign-Off",
    },
    {
      id: "incident_playbook",
      name: "Incident Response Playbook",
      category: "Incident Response / DFIR",
      desc: "Step-by-step procedural runbook for isolating compromised endpoints, preserving memory, and eradicating threats.",
      previewSnippet: "1.0 Initial Trigger • 2.0 Technical Runbook • 3.0 Evidence Preservation",
    },
  ],
  threat_intelligence: [
    {
      id: "threat_intel_report",
      name: "Threat Intelligence Report",
      category: "Threat Intelligence",
      desc: "Tactical intelligence brief detailing adversary TTPs, MITRE ATT&CK mappings, IOC indicators, and risk implications.",
      previewSnippet: "1.0 Threat Summary • 2.0 MITRE ATT&CK Matrix • 3.0 Indicators of Compromise",
    },
  ],
  security_architecture_engineering: [
    {
      id: "threat_model",
      name: "Threat Model",
      category: "Security Architecture",
      desc: "STRIDE-based system decomposition identifying trust boundaries, attack vectors, data flows, and countermeasures.",
      previewSnippet: "1.0 Architecture Breakdown • 2.0 STRIDE Matrix • 3.0 Mitigation Specifications",
    },
    {
      id: "security_architecture",
      name: "Security Architecture Document",
      category: "Security Architecture",
      desc: "Comprehensive engineering blueprint specifying network enclaves, cryptographic controls, IAM models, and boundaries.",
      previewSnippet: "1.0 Boundary Definitions • 2.0 Cryptographic Specs • 3.0 Access Control Model",
    },
  ],
  risk_governance: [
    {
      id: "risk_assessment",
      name: "Cybersecurity Risk Assessment",
      category: "Risk / Governance",
      desc: "Quantitative risk evaluation analyzing threat likelihood, business impact scores, and treatment recommendations.",
      previewSnippet: "1.0 Scope & Assets • 2.0 Threat Likelihood Scoring • 3.0 Treatment Plan",
    },
  ],
  resilience: [
    {
      id: "bia",
      name: "Business Impact Analysis (BIA)",
      category: "Resilience",
      desc: "Mission-critical system evaluation defining RTO and RPO metrics, financial downtime impacts, and operational dependencies.",
      previewSnippet: "1.0 Critical Systems • 2.0 RTO/RPO Metrics • 3.0 Outage Impact Analysis",
    },
  ],
};

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

  // 6-step exact sequence:
  // 1: WELCOME / 01
  // 2: IDENTITY / PERSONA
  // 3: DISCIPLINE / WHAT DO YOU WORK WITH
  // 4: FIRST DOCUMENT SELECTION
  // 5: WORKSPACE SETUP
  // 6: WORKSPACE READY
  const [step, setStep] = useState<number>(1);
  const [selectedPersona, setSelectedPersona] = useState<PersonaId>(
    (initialData?.persona as PersonaId) || "cybersecurity_professional"
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("offensive_security");
  const [selectedDocId, setSelectedDocId] = useState<string>("pentest_agreement");
  const [workspaceName, setWorkspaceName] = useState<string>(
    initialData?.workspaceName || (user.name ? `${user.name.split(" ")[0]}'s Workspace` : "Primary Security Workspace")
  );
  const [organizationName, setOrganizationName] = useState<string>(
    initialData?.organizationName || (initialData?.testerProfile as any)?.providerName || ""
  );
  const [contactName, setContactName] = useState<string>(
    initialData?.representativeName || (initialData?.testerProfile as any)?.providerContactName || user.name || ""
  );
  const [contactEmail, setContactEmail] = useState<string>(
    initialData?.contactEmail || (initialData?.testerProfile as any)?.providerContactEmail || user.email || ""
  );
  const [department, setDepartment] = useState<string>(
    initialData?.department || (initialData?.testerProfile as any)?.providerDepartment || "Red Team & Offensive Operations"
  );
  const [phone, setPhone] = useState<string>(
    initialData?.phone || (initialData?.testerProfile as any)?.providerPhone || ""
  );
  const [professionalRole, setProfessionalRole] = useState<string>(
    initialData?.role || "Cybersecurity Lead"
  );
  const [defaultExportFormat, setDefaultExportFormat] = useState<string>("pdf");
  const [saving, setSaving] = useState<boolean>(false);

  const availableDocs = STARTER_DOCS[selectedCategory] || STARTER_DOCS["offensive_security"]!;
  const currentDoc = availableDocs.find((d) => d.id === selectedDocId) || availableDocs[0]!;

  const handleFinish = async (navigateToDoc: boolean = false) => {
    setSaving(true);
    const testerProfile = {
      providerName: organizationName,
      providerContactName: contactName,
      providerContactEmail: contactEmail,
      providerDepartment: department,
      providerPhone: phone,
    };
    const clientProfile = {
      clientName: organizationName,
      clientContactName: contactName,
      clientContactEmail: contactEmail,
      clientDepartment: department,
      clientPhone: phone,
      authorizedBy: contactName,
    };

    const finalData: OnboardingData = {
      persona: selectedPersona,
      role: professionalRole,
      documentFocus: selectedCategory,
      focusAreas: [selectedCategory],
      firstDocumentDef: selectedDocId,
      organizationName,
      representativeName: contactName,
      contactEmail,
      department,
      phone,
      workspaceName,
      defaultExportFormat,
      testerProfile,
      clientProfile,
    };

    await saveOnboardingProgress(user, {
      completed: true,
      step: 6,
      role: professionalRole,
      persona: selectedPersona,
      workspaceName,
      organizationName,
      representativeName: contactName,
      contactEmail,
      department,
      phone,
      defaultExportFormat,
      testerProfile,
      clientProfile,
      onboardingData: finalData,
    });

    setSaving(false);
    onComplete();

    if (navigateToDoc && selectedDocId) {
      router.push(`/document/new?def=${selectedDocId}`);
    } else {
      router.push("/(app)/home");
    }
  };

  if (!open) return null;

  return (
    <Modal visible={open} animationType="fade" transparent={false}>
      <View style={styles.screen}>
        
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Image
              source={require("../../assets/icon.png")}
              style={styles.topLogoIcon}
              resizeMode="contain"
            />
            <Text style={styles.topWordmark}>Draftoryn</Text>
            <View style={styles.topDot} />
            <Text style={styles.topSystemTag}>WORKSPACE INITIALIZATION</Text>
          </View>
          <Text style={styles.stepProgress}>STEP {String(step).padStart(2, "0")} / 06</Text>
        </View>

        {/* Hairline Progress Indicator */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(step / 6) * 100}%` }]} />
        </View>

        {/* Content Body */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[styles.scrollContent, isMobile ? styles.scrollMobile : styles.scrollDesktop]}
        >
          {/* ========================================================================= */}
          {/* STEP 01: WELCOME / 01                                                     */}
          {/* ========================================================================= */}
          {step === 1 && (
            <View style={styles.stepBlock}>
              <Image
                source={require("../../assets/logo.png")}
                style={styles.welcomeBannerLogo}
                resizeMode="contain"
              />
              <Text style={styles.eyebrow}>WELCOME / 01</Text>
              <Heading level={1} style={styles.stepHeadline}>
                Let's set up your workspace.
              </Heading>
              <Text style={styles.supportingText}>
                Draftoryn is professional documentation software for technical teams. Configure your
                operational parameters, persistent workspace, and initial document definitions.
              </Text>

              <View style={styles.welcomeSpecimen}>
                <View style={styles.specimenHeader}>
                  <Text style={styles.specimenTitle}>VERIFIED ENVIRONMENT</Text>
                  <Text style={styles.specimenStatus}>ONLINE</Text>
                </View>
                <View style={styles.specimenDivider} />
                <View style={styles.specimenRow}>
                  <Text style={styles.specimenKey}>AUTHENTICATION</Text>
                  <Text style={styles.specimenVal}>Authenticated Session ({user.email || user.userId})</Text>
                </View>
                <View style={styles.specimenRow}>
                  <Text style={styles.specimenKey}>DATABASE</Text>
                  <Text style={styles.specimenVal}>Primary Relational Store [Source of Truth]</Text>
                </View>
                <View style={styles.specimenRow}>
                  <Text style={styles.specimenKey}>CATALOG</Text>
                  <Text style={styles.specimenVal}>30 Canonical Technical Specifications</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <Button label="Continue →" onPress={() => setStep(2)} style={styles.primaryBtn} />
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* STEP 02: IDENTITY / INTENT (HOW WILL YOU USE DRAFTORYN?)                  */}
          {/* ========================================================================= */}
          {step === 2 && (
            <View style={styles.stepBlock}>
              <Text style={styles.eyebrow}>IDENTITY / 02</Text>
              <Heading level={1} style={styles.stepHeadline}>
                How will you use Draftoryn?
              </Heading>
              <Text style={styles.supportingText}>
                Select your primary operational context. This personalizes your catalog priority, document defaults, and profile schemas.
              </Text>

              <View style={styles.selectionGrid}>
                {PERSONAS.map((p) => {
                  const active = p.id === selectedPersona;
                  return (
                    <Pressable
                      key={p.id}
                      style={[styles.selectionCard, active && styles.selectionCardActive]}
                      onPress={() => setSelectedPersona(p.id)}
                    >
                      <View style={styles.selectionCardTop}>
                        <Text style={[styles.selectionCardTitle, active && { color: "#2F6BFF" }]}>{p.label}</Text>
                        <View style={[styles.selectionRadio, active && styles.selectionRadioActive]}>
                          {active && <View style={styles.selectionRadioInner} />}
                        </View>
                      </View>
                      <Text style={styles.selectionCardDesc}>{p.description}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.navRow}>
                <Button label="← Back" variant="secondary" onPress={() => setStep(1)} />
                <Button label="Continue →" onPress={() => setStep(3)} style={styles.primaryBtn} />
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* STEP 03: DISCIPLINE (WHAT DO YOU WORK WITH?)                              */}
          {/* ========================================================================= */}
          {step === 3 && (
            <View style={styles.stepBlock}>
              <Text style={styles.eyebrow}>DISCIPLINE / 03</Text>
              <Heading level={1} style={styles.stepHeadline}>
                What do you work with?
              </Heading>
              <Text style={styles.supportingText}>
                Select your primary discipline area from our canonical Draftoryn categories.
              </Text>

              <View style={styles.selectionGrid}>
                {CATEGORIES_LIST.map((cat) => {
                  const active = cat.id === selectedCategory;
                  return (
                    <Pressable
                      key={cat.id}
                      style={[styles.selectionCard, active && styles.selectionCardActive]}
                      onPress={() => {
                        setSelectedCategory(cat.id);
                        const docs = STARTER_DOCS[cat.id];
                        if (docs && docs[0]) {
                          setSelectedDocId(docs[0].id);
                        }
                      }}
                    >
                      <View style={styles.selectionCardTop}>
                        <Text style={[styles.selectionCardTitle, active && { color: "#2F6BFF" }]}>{cat.label}</Text>
                        <View style={[styles.selectionRadio, active && styles.selectionRadioActive]}>
                          {active && <View style={styles.selectionRadioInner} />}
                        </View>
                      </View>
                      <Text style={styles.selectionCardDesc}>{cat.desc}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.navRow}>
                <Button label="← Back" variant="secondary" onPress={() => setStep(2)} />
                <Button label="Continue →" onPress={() => setStep(4)} style={styles.primaryBtn} />
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* STEP 04: FIRST DOCUMENT SELECTION                                         */}
          {/* ========================================================================= */}
          {step === 4 && (
            <View style={styles.stepBlock}>
              <Text style={styles.eyebrow}>STARTER DOCUMENT / 04</Text>
              <Heading level={1} style={styles.stepHeadline}>
                What do you want to create first?
              </Heading>
              <Text style={styles.supportingText}>
                Choose an initial supported document definition to instantiate in your workspace.
              </Text>

              <View style={styles.selectionGrid}>
                {availableDocs.map((doc) => {
                  const active = doc.id === selectedDocId;
                  return (
                    <Pressable
                      key={doc.id}
                      style={[styles.selectionCard, active && styles.selectionCardActive]}
                      onPress={() => setSelectedDocId(doc.id)}
                    >
                      <View style={styles.selectionCardTop}>
                        <Text style={[styles.selectionCardTitle, active && { color: "#2F6BFF" }]}>{doc.name}</Text>
                        <View style={[styles.selectionRadio, active && styles.selectionRadioActive]}>
                          {active && <View style={styles.selectionRadioInner} />}
                        </View>
                      </View>
                      <Text style={styles.selectionCardDesc}>{doc.desc}</Text>
                      <View style={styles.docPreviewBar}>
                        <Text style={styles.docPreviewKey}>OUTLINE PREVIEW:</Text>
                        <Text style={styles.docPreviewVal}>{doc.previewSnippet}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.navRow}>
                <Button label="← Back" variant="secondary" onPress={() => setStep(3)} />
                <Button label="Continue to Setup →" onPress={() => setStep(5)} style={styles.primaryBtn} />
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* STEP 05: WORKSPACE SETUP                                                  */}
          {/* ========================================================================= */}
          {step === 5 && (
            <View style={styles.stepBlock}>
              <Text style={styles.eyebrow}>WORKSPACE SETUP / 05</Text>
              <Heading level={1} style={styles.stepHeadline}>
                Configure your workspace parameters.
              </Heading>
              <Text style={styles.supportingText}>
                These settings persist directly into your workspace and establish your default document autofill profiles.
              </Text>

              <View style={styles.formPanel}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>WORKSPACE NAME</Text>
                  <TextInput
                    style={styles.formInput}
                    value={workspaceName}
                    onChangeText={setWorkspaceName}
                    placeholder="e.g. Primary Security Workspace"
                    placeholderTextColor="#727780"
                  />
                  <Text style={styles.formHint}>Maps to your organization workspace record.</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {selectedPersona === "client" ? "ORGANIZATION / COMPANY NAME" : "TESTING FIRM / ORGANIZATION NAME"}
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    value={organizationName}
                    onChangeText={setOrganizationName}
                    placeholder={selectedPersona === "client" ? "e.g. Acme Corporation" : "e.g. Draftoryn Security Consulting Inc."}
                    placeholderTextColor="#727780"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {selectedPersona === "client" ? "CLIENT REPRESENTATIVE NAME" : "LEAD ASSESSOR / TESTER NAME"}
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    value={contactName}
                    onChangeText={setContactName}
                    placeholder={selectedPersona === "client" ? "e.g. Jane Doe" : "e.g. Alex Mercer"}
                    placeholderTextColor="#727780"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {selectedPersona === "client" ? "PRIMARY CONTACT EMAIL" : "TESTER EMAIL ADDRESS"}
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    value={contactEmail}
                    onChangeText={setContactEmail}
                    placeholder="alex@draftoryn.io"
                    placeholderTextColor="#727780"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>DEPARTMENT / PRACTICE UNIT</Text>
                  <TextInput
                    style={styles.formInput}
                    value={department}
                    onChangeText={setDepartment}
                    placeholder="e.g. Red Team & Offensive Operations"
                    placeholderTextColor="#727780"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>DIRECT / EMERGENCY PHONE</Text>
                  <TextInput
                    style={styles.formInput}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+1 (555) 019-2834"
                    placeholderTextColor="#727780"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>PROFESSIONAL ROLE TITLE</Text>
                  <TextInput
                    style={styles.formInput}
                    value={professionalRole}
                    onChangeText={setProfessionalRole}
                    placeholder="e.g. Senior Penetration Tester"
                    placeholderTextColor="#727780"
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
                <Button label="← Back" variant="secondary" onPress={() => setStep(4)} />
                <Button label="Complete Setup →" onPress={() => setStep(6)} style={styles.primaryBtn} />
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* STEP 06: WORKSPACE READY                                                  */}
          {/* ========================================================================= */}
          {step === 6 && (
            <View style={styles.stepBlock}>
              <Text style={styles.eyebrow}>COMPLETION / 06</Text>
              <Heading level={1} style={styles.stepHeadline}>
                Your workspace is ready.
              </Heading>
              <Text style={styles.supportingText}>
                Your configuration parameters are ready to be saved as the authoritative state in your workspace.
              </Text>

              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>WORKSPACE</Text>
                  <Text style={styles.summaryVal}>{workspaceName || "Primary Workspace"}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>OPERATIONAL PERSONA</Text>
                  <Text style={styles.summaryVal}>{selectedPersona.toUpperCase()}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>DOCUMENT FOCUS</Text>
                  <Text style={styles.summaryVal}>{selectedCategory.toUpperCase()}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>STARTER SPECIFICATION</Text>
                  <Text style={[styles.summaryVal, { color: "#2F6BFF" }]}>{currentDoc.name}</Text>
                </View>
              </View>

              <View style={styles.completionActionBlock}>
                <Button
                  label={saving ? "Saving..." : "Create your first document →"}
                  disabled={saving}
                  onPress={() => handleFinish(true)}
                  style={styles.primaryBtn}
                />
                <Button
                  label="Explore the catalog"
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
    backgroundColor: "#090A0C",
  },
  topBar: {
    height: 54,
    backgroundColor: "#101216",
    borderBottomWidth: 1,
    borderColor: "#272B32",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 32,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topLogoIcon: {
    width: 22,
    height: 22,
    borderRadius: 4,
  },
  welcomeBannerLogo: {
    width: 220,
    height: 70,
    marginBottom: 24,
    alignSelf: "flex-start",
  },
  topWordmark: {
    fontFamily: theme.font.sansBold,
    fontSize: 16,
    letterSpacing: -0.4,
    color: "#F5F3EE",
  },
  topDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2F6BFF",
  },
  topSystemTag: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1.54,
    color: "#727780",
  },
  stepProgress: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1.54,
    color: "#2F6BFF",
  },
  progressTrack: {
    height: 2,
    backgroundColor: "#15181D",
    width: "100%",
  },
  progressFill: {
    height: 2,
    backgroundColor: "#2F6BFF",
  },

  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 56,
    paddingHorizontal: 24,
    alignSelf: "center",
    width: "100%",
  },
  scrollMobile: {
    maxWidth: "100%",
  },
  scrollDesktop: {
    maxWidth: 780,
  },

  stepBlock: {
    gap: 16,
  },
  eyebrow: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1.54,
    textTransform: "uppercase",
    color: "#2F6BFF",
  },
  stepHeadline: {
    fontFamily: theme.font.sansBold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1,
    color: "#F5F3EE",
  },
  supportingText: {
    fontFamily: theme.font.sans,
    fontSize: 16,
    lineHeight: 24.8,
    color: "#A1A5AD",
    marginBottom: 8,
  },

  welcomeSpecimen: {
    backgroundColor: "#101216",
    borderWidth: 1,
    borderColor: "#272B32",
    borderRadius: 8,
    padding: 20,
    gap: 12,
    marginVertical: 16,
  },
  specimenHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  specimenTitle: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1.54,
    color: "#727780",
  },
  specimenStatus: {
    fontFamily: theme.font.monoMedium,
    fontSize: 10,
    color: "#31B77A",
  },
  specimenDivider: {
    height: 1,
    backgroundColor: "#272B32",
  },
  specimenRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  specimenKey: {
    fontFamily: theme.font.mono,
    fontSize: 11,
    color: "#727780",
  },
  specimenVal: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11.5,
    color: "#F5F3EE",
  },

  selectionGrid: {
    gap: 12,
    marginVertical: 14,
  },
  selectionCard: {
    backgroundColor: "#101216",
    borderWidth: 1,
    borderColor: "#272B32",
    borderRadius: 8,
    padding: 20,
    gap: 8,
  },
  selectionCardActive: {
    borderColor: "#2F6BFF",
    backgroundColor: "#15181D",
  },
  selectionCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectionCardTitle: {
    fontFamily: theme.font.sansBold,
    fontSize: 16,
    letterSpacing: 0.5,
    color: "#F5F3EE",
  },
  selectionRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#343941",
    alignItems: "center",
    justifyContent: "center",
  },
  selectionRadioActive: {
    borderColor: "#2F6BFF",
  },
  selectionRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2F6BFF",
  },
  selectionCardDesc: {
    fontFamily: theme.font.sans,
    fontSize: 14,
    lineHeight: 21,
    color: "#A1A5AD",
  },
  docPreviewBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: "#272B32",
  },
  docPreviewKey: {
    fontFamily: theme.font.mono,
    fontSize: 9.5,
    letterSpacing: 1,
    color: "#727780",
  },
  docPreviewVal: {
    fontFamily: theme.font.mono,
    fontSize: 10.5,
    color: "#2F6BFF",
    flex: 1,
  },

  formPanel: {
    backgroundColor: "#101216",
    borderWidth: 1,
    borderColor: "#272B32",
    borderRadius: 8,
    padding: 24,
    gap: 18,
    marginVertical: 14,
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1.54,
    color: "#A1A5AD",
  },
  formInput: {
    backgroundColor: "#15181D",
    borderWidth: 1,
    borderColor: "#272B32",
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: "#F5F3EE",
    fontFamily: theme.font.sans,
  },
  formHint: {
    fontFamily: theme.font.sans,
    fontSize: 12,
    color: "#727780",
  },
  formatRow: {
    flexDirection: "row",
    gap: 10,
  },
  formatBtn: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#272B32",
    borderRadius: 6,
    backgroundColor: "#15181D",
    alignItems: "center",
    justifyContent: "center",
  },
  formatBtnActive: {
    borderColor: "#2F6BFF",
    backgroundColor: "rgba(47, 107, 255, 0.12)",
  },
  formatBtnText: {
    fontFamily: theme.font.monoMedium,
    fontSize: 11,
    letterSpacing: 1,
    color: "#727780",
  },
  formatBtnTextActive: {
    color: "#2F6BFF",
  },

  summaryBox: {
    backgroundColor: "#101216",
    borderWidth: 1,
    borderColor: "#272B32",
    borderRadius: 8,
    padding: 22,
    gap: 12,
    marginVertical: 18,
  },
  summaryRow: {
    gap: 4,
  },
  summaryKey: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    letterSpacing: 1.5,
    color: "#727780",
  },
  summaryVal: {
    fontFamily: theme.font.sansSemi,
    fontSize: 15,
    color: "#F5F3EE",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#272B32",
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
  completionActionBlock: {
    gap: 12,
    marginTop: 20,
  },
  primaryBtn: {
    height: 44,
    borderRadius: 6,
    backgroundColor: "#2F6BFF",
  },
});
