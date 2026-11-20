import "./loadEnv"; // Keep this FIRST: it loads .env.local before gemini.ts reads process.env.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { AgentError, runAgent, type AgentResult } from "@/agent/loop";
import { DEFAULT_PROFILE } from "@/lib/defaultProfile";
import { fileToInlineImage } from "@/lib/imageUtils";
import { TONES, type Tone } from "@/lib/schemas";

interface Case {
  file: string;
  isJobPosting: boolean;
  titleContains?: string;
  companyContains?: string;
  mustHaveSkills?: string[];
  tone?: Tone;
}

// "soft" checks are warnings (style); the rest are hard checks that decide pass or fail.
interface Check {
  name: string;
  pass: boolean;
  soft?: boolean;
  detail?: string;
}

interface Outcome {
  file: string;
  status: "pass" | "fail" | "error";
  tone: Tone;
  seconds: number;
  checks: Check[];
  error?: string;
}

const ROOT = process.cwd();
const SAMPLES = path.join(ROOT, "evals/samples");
const DELAY_MS = Number(process.env.EVAL_DELAY_MS ?? 5000); // pause between cases (free-tier rate limits)

const MIME: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };
const WORDS: Record<Tone, [number, number]> = { formal: [150, 260], friendly: [120, 220], short: [40, 110] };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const has = (haystack: string | null | undefined, needle: string) =>
  (haystack ?? "").toLowerCase().includes(needle.toLowerCase());

function loadCases(): Case[] {
  const raw = JSON.parse(readFileSync(path.join(ROOT, "evals/cases.json"), "utf8")) as Case[];
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("evals/cases.json must be a non-empty array.");
  for (const c of raw) {
    if (!c.file || typeof c.isJobPosting !== "boolean") {
      throw new Error(`Every case needs "file" and "isJobPosting". Problem entry: ${JSON.stringify(c)}`);
    }
    if (c.tone && !TONES.includes(c.tone)) throw new Error(`${c.file}: tone must be one of ${TONES.join(", ")}`);
  }
  return raw;
}

/** Did the agent read the screenshot correctly? */
function extractionChecks(c: Case, r: AgentResult): Check[] {
  const out: Check[] = [];
  if (c.titleContains) {
    out.push({ name: `title contains "${c.titleContains}"`, pass: has(r.job.title, c.titleContains), detail: `got: ${r.job.title ?? "null"}` });
  }
  if (c.companyContains) {
    out.push({ name: `company contains "${c.companyContains}"`, pass: has(r.job.company, c.companyContains), detail: `got: ${r.job.company ?? "null"}` });
  }
  const pool = [...r.job.skills, ...r.job.requirements, ...r.job.responsibilities, ...r.job.niceToHave].join(" | ");
  for (const skill of c.mustHaveSkills ?? []) {
    out.push({ name: `found skill "${skill}"`, pass: has(pool, skill) });
  }
  return out;
}

/** Is the letter safe and usable? */
function letterChecks(tone: Tone, r: AgentResult): Check[] {
  const words = r.letter.trim().split(/\s+/).length;
  const [min, max] = WORDS[tone];
  const claimedGaps = r.gaps.filter((g) => has(r.letter, g));

  return [
    { name: "fact-check guardrail passed", pass: r.verification.ok, detail: r.verification.problems.join("; ") },
    { name: "letter uses the candidate's name", pass: has(r.letter, DEFAULT_PROFILE.name) },
    { name: "no [placeholder] text", pass: !/\[[^\]]{1,40}\]/.test(r.letter) },
    { name: `word count fits "${tone}" (${min}-${max})`, pass: words >= min && words <= max, soft: true, detail: `${words} words` },
    { name: "does not mention skills missing from the profile", pass: claimedGaps.length === 0, soft: true, detail: claimedGaps.join(", ") },
  ];
}

async function runCase(c: Case): Promise<Outcome> {
  const tone = c.tone ?? "formal";
  const started = Date.now();
  const done = (status: Outcome["status"], checks: Check[], error?: string): Outcome => ({
    file: c.file, status, tone, seconds: (Date.now() - started) / 1000, checks, error,
  });

  const filePath = path.join(SAMPLES, c.file);
  if (!existsSync(filePath)) return done("error", [], `File not found: evals/samples/${c.file}`);

  try {
    const type = MIME[path.extname(c.file).toLowerCase()] ?? "application/octet-stream";
    const image = await fileToInlineImage(new File([readFileSync(filePath)], c.file, { type }));

    let result: AgentResult;
    try {
      result = await runAgent({ image, profile: DEFAULT_PROFILE, tone });
    } catch (err) {
      if (!(err instanceof AgentError)) throw err;
      // The agent said "this is not a job posting".
      const check: Check = c.isJobPosting
        ? { name: "recognises a real job posting", pass: false, detail: err.message }
        : { name: "rejects an image that is not a job", pass: true };
      return done(check.pass ? "pass" : "fail", [check]);
    }

    if (!c.isJobPosting) {
      return done("fail", [{ name: "rejects an image that is not a job", pass: false, detail: "agent treated it as a job" }]);
    }

    const checks = [...extractionChecks(c, result), ...letterChecks(tone, result)];
    const ok = checks.every((k) => k.pass || k.soft);
    return done(ok ? "pass" : "fail", checks);
  } catch (err) {
    // API trouble (rate limit, network, bad key) is NOT an agent quality failure, so report it separately.
    return done("error", [], err instanceof Error ? err.message : String(err));
  }
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is missing. Add it to .env.local first.");
    process.exit(1);
  }

  const cases = loadCases();
  console.log(`Running ${cases.length} eval case(s) with ${DELAY_MS / 1000}s between cases...\n`);

  const outcomes: Outcome[] = [];
  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    process.stdout.write(`[${i + 1}/${cases.length}] ${c.file} (${c.tone ?? "formal"}) ... `);
    const o = await runCase(c);
    outcomes.push(o);
    console.log(`${o.status.toUpperCase()} (${o.seconds.toFixed(1)}s)`);

    if (o.error) console.log(`      error: ${o.error}`);
    for (const k of o.checks) {
      const mark = k.pass ? "[ok]" : k.soft ? "[!] " : "[X] ";
      const detail = !k.pass && k.detail ? `  -> ${k.detail}` : "";
      console.log(`   ${mark} ${k.name}${detail}`);
    }
    if (i < cases.length - 1) await sleep(DELAY_MS);
  }

  const passed = outcomes.filter((o) => o.status === "pass").length;
  const failed = outcomes.filter((o) => o.status === "fail").length;
  const errors = outcomes.filter((o) => o.status === "error").length;
  const hard = outcomes.flatMap((o) => o.checks).filter((k) => !k.soft);
  const hardPassed = hard.filter((k) => k.pass).length;

  console.log("\n----------------------------------------");
  console.log(`Cases: ${outcomes.length} | passed ${passed} | failed ${failed} | errors ${errors}`);
  console.log(`Hard checks passed: ${hardPassed}/${hard.length}`);
  if (errors > 0) console.log("Errors are API or file problems, not agent quality. Fix them and run again.");

  // Saved without the letters, so it is safe to commit as proof of your results.
  writeFileSync(
    path.join(ROOT, "evals/results.json"),
    JSON.stringify(
      { ranAt: new Date().toISOString(), summary: { cases: outcomes.length, passed, failed, errors, hardChecks: `${hardPassed}/${hard.length}` }, outcomes },
      null,
      2
    )
  );
  console.log("Saved: evals/results.json");

  process.exitCode = failed > 0 || errors > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});