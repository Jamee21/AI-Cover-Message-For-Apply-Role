import type { InlineImage } from "@/lib/imageUtils";
import type { Job, Match, Profile, Tone, Verification } from "@/lib/schemas";
import { extractJob } from "./tools/extractJob";
import { extractJobFromText } from "./tools/extractJobFromText";
import { matchProfile } from "./tools/matchProfile";
import { writeLetter } from "./tools/writeLetter";
import { verifyLetter } from "./tools/verifyLetter";

const MAX_REVISIONS = 2; // bounded loop: never runs forever

export class AgentError extends Error {
  constructor(message: string, public readonly status = 422) {
    super(message);
    this.name = "AgentError";
  }
}

export interface AgentStep {
  name: string;
  ms: number;
  note?: string;
}

/** Live events so the UI can show the agent working, step by step. */
export type StepEvent =
  | { type: "start"; name: string }
  | { type: "done"; name: string; ms: number; note?: string };

export interface AgentResult {
  job: Job;
  match: Match;
  gaps: string[];
  letter: string;
  verification: Verification;
  revisions: number;
  steps: AgentStep[];
}

/** extract -> match -> write -> verify -> (revise <= MAX_REVISIONS) */
export async function runAgent(input: {
  image?: InlineImage;
  jobText?: string;
  profile: Profile;
  tone: Tone;
  onStep?: (event: StepEvent) => void; // optional, so older callers still work
}): Promise<AgentResult> {
  const { image, jobText, profile, tone, onStep } = input;
  if (!image && !jobText) throw new AgentError("Add a job description to continue.", 400);
  const steps: AgentStep[] = [];

  async function step<T>(name: string, fn: () => Promise<T>, note?: (r: T) => string): Promise<T> {
    onStep?.({ type: "start", name });
    const t = Date.now();
    const r = await fn();
    const ms = Date.now() - t;
    const n = note?.(r);
    steps.push({ name, ms, note: n });
    onStep?.({ type: "done", name, ms, note: n });
    return r;
  }

  const { job } = await step(
    "extract_job",
    () => (image ? extractJob(image) : extractJobFromText(jobText!)),
    (r) => r.job.title ?? "no title"
  );
  if (!job.isJobPosting) {
    throw new AgentError("This text doesn't look like a job posting. Paste the role description and requirements.");
  }

  const { match, gaps } = await step(
    "match_profile",
    () => matchProfile(job, profile),
    (r) => `${r.match.matchedSkills.length} skills matched, ${r.gaps.length} gaps`
  );

  let letter = await step("write_letter", () => writeLetter({ job, profile, match, gaps, tone }));
  let verification = await step(
    "verify_letter",
    () => verifyLetter(letter, profile),
    (r) => (r.ok ? "passed" : `${r.problems.length} problem(s)`)
  );

  let revisions = 0;
  while (!verification.ok && revisions < MAX_REVISIONS) {
    revisions++;
    const fixes = verification.problems;
    letter = await step(`revise_letter_${revisions}`, () =>
      writeLetter({ job, profile, match, gaps, tone, fixes })
    );
    verification = await step(
      `verify_letter_${revisions}`,
      () => verifyLetter(letter, profile),
      (r) => (r.ok ? "passed" : `${r.problems.length} problem(s)`)
    );
  }

  return { job, match, gaps, letter, verification, revisions, steps };
}