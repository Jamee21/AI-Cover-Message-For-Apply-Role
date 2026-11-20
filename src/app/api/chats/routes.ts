import { NextRequest, NextResponse } from "next/server";
import { fileToInlineImage, ImageError } from "@/lib/imageUtils";
import { GeminiError } from "@/lib/gemini";
import { ProfileSchema, TONES, type Tone } from "@/lib/schemas";
import { AgentError, runAgent } from "@/agent/loop";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Turn any error into a short message the person can act on. */
function describe(err: unknown): { error: string; kind?: string } {
  if (err instanceof AgentError) return { error: err.message };
  if (err instanceof GeminiError) return { error: err.message, kind: err.kind };
  console.error(err);
  return { error: "Unexpected server error." };
}

export async function POST(req: NextRequest) {
  /* ---- 1. Validate everything BEFORE streaming, so bad input gets a normal error ---- */
  let image;
  let profile;
  let tone: Tone;

  try {
    const form = await req.formData();

    const file = form.get("screenshot");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Add a screenshot of the job first." }, { status: 400 });
    }

    tone = String(form.get("tone") ?? "formal") as Tone;
    if (!TONES.includes(tone)) {
      return NextResponse.json({ error: `Tone must be one of: ${TONES.join(", ")}` }, { status: 400 });
    }

    let profileRaw: unknown;
    try {
      profileRaw = JSON.parse(String(form.get("profile") ?? ""));
    } catch {
      return NextResponse.json({ error: "Your profile is missing. Open Profile and save it." }, { status: 400 });
    }
    const parsed = ProfileSchema.safeParse(profileRaw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return NextResponse.json({ error: `Your profile has a problem - ${msg}` }, { status: 400 });
    }
    profile = parsed.data;

    image = await fileToInlineImage(file);
  } catch (err) {
    if (err instanceof ImageError) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json(describe(err), { status: 500 });
  }

  /* ---- 2. Stream the agent's progress as it works (one JSON object per line) ---- */
  const encoder = new TextEncoder();
  let open = true; // becomes false if the person closes the tab

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
        } catch {
          open = false;
        }
      };

      try {
        const result = await runAgent({ image, profile, tone, onStep: (event) => send(event) });
        send({ type: "result", data: result });
      } catch (err) {
        send({ type: "error", ...describe(err) });
      } finally {
        if (open) {
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      }
    },
    cancel() {
      open = false;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}