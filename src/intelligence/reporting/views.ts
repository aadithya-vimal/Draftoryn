// View projections: executive / technical / full / remediation / retest.
// One canonical model; views filter sections, never duplicate analysis.

import type { IntelligenceReport, ReportSection, ReportView } from "../schemas";

const VIEW_SECTIONS: Record<ReportView, Array<ReportSection["view"]>> = {
  executive: ["executive", "shared"],
  technical: ["technical", "shared"],
  full: ["executive", "technical", "shared", "appendix"],
  remediation: ["shared", "technical"],
  retest: ["shared", "technical", "appendix"],
};

export function projectView(report: IntelligenceReport, view: ReportView): IntelligenceReport {
  const allowed = VIEW_SECTIONS[view];
  return {
    ...report,
    view,
    sections: report.sections.filter((s) => allowed.includes(s.view)),
  };
}
