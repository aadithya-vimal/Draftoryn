// Persistent job model: QUEUED → UPLOADING → PARSING → ANALYZING →
// CORRELATING → GENERATING → VALIDATING → COMPLETED / FAILED.
// Survives browser refresh: state lives server-side, UI polls.

export const JOB_STATES = [
  "queued",
  "uploading",
  "parsing",
  "analyzing",
  "correlating",
  "generating",
  "validating",
  "completed",
  "failed",
] as const;
export type JobState = (typeof JOB_STATES)[number];

const TERMINAL: JobState[] = ["completed", "failed"];

const ALLOWED: Record<JobState, JobState[]> = {
  queued: ["uploading", "parsing", "failed"],
  uploading: ["parsing", "failed"],
  parsing: ["analyzing", "failed"],
  analyzing: ["correlating", "failed"],
  correlating: ["generating", "validating", "completed", "failed"],
  generating: ["validating", "failed"],
  validating: ["completed", "failed"],
  completed: [],
  failed: ["queued"],
};

export interface Job {
  id: string;
  analysisId?: string;
  ownerId: string;
  kind: string;
  status: JobState;
  progress: Record<string, unknown>;
  error?: string;
  events: Array<{ status: JobState; detail: string; at: string }>;
}

export class JobManager {
  private jobs = new Map<string, Job>();

  create(id: string, ownerId: string, kind: string, analysisId?: string): Job {
    const job: Job = { id, ownerId, kind, status: "queued", progress: {}, analysisId, events: [{ status: "queued", detail: "created", at: new Date().toISOString() }] };
    this.jobs.set(id, job);
    return job;
  }

  get(id: string, ownerId: string): Job | null {
    const j = this.jobs.get(id);
    return j && j.ownerId === ownerId ? j : null;
  }

  transition(id: string, ownerId: string, to: JobState, detail = "", progress?: Record<string, unknown>): Job {
    const job = this.get(id, ownerId);
    if (!job) throw new Error("Job not found.");
    if (!ALLOWED[job.status].includes(to)) {
      throw new Error(`Illegal job transition ${job.status} → ${to}.`);
    }
    job.status = to;
    if (progress) job.progress = { ...job.progress, ...progress };
    if (to === "failed") job.error = detail || "failed";
    job.events.push({ status: to, detail, at: new Date().toISOString() });
    return job;
  }

  isTerminal(status: JobState): boolean {
    return TERMINAL.includes(status);
  }
}
