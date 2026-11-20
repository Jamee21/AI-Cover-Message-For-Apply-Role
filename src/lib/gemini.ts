import { GoogleGenAI } from "@google/genai";
import type { z } from "zod";

// Models are tried in order. Override in .env.local: GEMINI_MODELS=a,b,c
// (Google renames/retires models often, so never hardcode only one.)
const MODELS = (
  process.env.GEMINI_MODELS ??
  "gemini-3.8-flash,gemini-3.6-flash,gemini-3.5-flash-lite"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS ?? 45_000);
const MAX_RETRIES = 2; // retries per model, before falling back to the next one

export type GeminiErrorKind =
  | "config"
  | "auth"
  | "bad_request"
  | "model_unavailable"
  | "overloaded"
  | "timeout"
  | "empty_output"
  | "invalid_output"
  | "unknown";

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly kind: GeminiErrorKind,
    public readonly detail?: unknown
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

const FATAL: ReadonlySet<GeminiErrorKind> = new Set(["config", "auth", "bad_request"]);

export type Part =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export interface GenerateOptions {
  system?: string;
  parts: Part[];
  json?: boolean;
  temperature?: number;
}

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError("GEMINI_API_KEY is missing. Add it to .env.local", "config");
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    t = setTimeout(
      () => reject(new GeminiError(`Request timed out after ${ms}ms`, "timeout")),
      ms
    );
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(t));
}

function classify(err: unknown): GeminiError {
  if (err instanceof GeminiError) return err;
  const e = err as { status?: number; code?: number; message?: string };
  const status = e?.status ?? e?.code;
  const msg = e?.message ?? String(err);

  if (status === 401 || status === 403 || /api key/i.test(msg))
    return new GeminiError("Gemini rejected the API key / permissions", "auth", err);
  if (status === 404)
    return new GeminiError(`Model not available: ${msg}`, "model_unavailable", err);
  if (status === 400) return new GeminiError(`Bad request: ${msg}`, "bad_request", err);
  if (status === 429 || (typeof status === "number" && status >= 500))
    return new GeminiError(`Gemini busy or rate-limited (${status})`, "overloaded", err);
  return new GeminiError(msg, "unknown", err);
}

export interface GenerateResult {
  text: string;
  model: string;
}

/** One logical call: retry with backoff, then fall back to the next model. */
export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  const ai = getClient();
  let last: GeminiError | undefined;

  for (const model of MODELS) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await withTimeout(
          ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: opts.parts }],
            config: {
              systemInstruction: opts.system,
              temperature: opts.temperature ?? 0.2,
              ...(opts.json ? { responseMimeType: "application/json" } : {}),
            },
          }),
          TIMEOUT_MS
        );
        const out = res.text?.trim();
        if (!out) throw new GeminiError("Model returned empty output", "empty_output");
        return { text: out, model };
      } catch (err) {
        last = classify(err);
        console.warn(`[gemini] ${model} attempt ${attempt + 1} failed: ${last.kind} - ${last.message}`);
        if (FATAL.has(last.kind)) throw last;
        if (last.kind === "model_unavailable") break; // go to next model now
        if (attempt < MAX_RETRIES) await sleep(800 * 2 ** attempt + Math.random() * 300);
      }
    }
  }
  throw last ?? new GeminiError("No Gemini models configured", "config");
}

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

/** Generate JSON and validate with zod. One self-repair attempt if invalid. */
export async function generateJson<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  opts: Omit<GenerateOptions, "json">
): Promise<{ data: T; model: string }> {
  let parts = opts.parts;
  let issue = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    const { text, model } = await generate({ ...opts, parts, json: true });
    try {
      const parsed = schema.safeParse(JSON.parse(stripFences(text)));
      if (parsed.success) return { data: parsed.data, model };
      issue = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    } catch {
      issue = "output was not valid JSON";
    }
    parts = [
      ...opts.parts,
      { text: `Your previous answer was rejected (${issue}). Return ONLY valid JSON in the requested shape.` },
    ];
  }
  throw new GeminiError(`Model output failed validation: ${issue}`, "invalid_output");
}
