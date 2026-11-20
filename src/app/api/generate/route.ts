import { NextRequest, NextResponse } from "next/server";
import { fileToInlineImage, ImageError } from "@/lib/imageUtils";
import { GeminiError } from "@/lib/gemini";
import { ProfileSchema, TONES, type Profile, type Tone } from "@/lib/schemas";
import { AgentError, runAgent } from "@/agent/loop";
import { extractResumeProfile, normalizeResumeText, readResumeFile, ResumeError } from "@/agent/tools/extractResume";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const tone = String(form.get("tone") ?? "formal") as Tone;
    if (!TONES.includes(tone)) {
      return NextResponse.json({ error: `tone must be one of: ${TONES.join(", ")}` }, { status: 400 });
    }

    const resumeFile = form.get("resume");
    const resumeInput = String(form.get("resumeText") ?? "").trim();
    const jobDescription = String(form.get("jobDescription") ?? "").trim();
    const screenshot = form.get("screenshot");

    if (jobDescription.length > 30_000) {
      return NextResponse.json({ error: "Job description is too long (maximum 30,000 characters)." }, { status: 400 });
    }
    if (!jobDescription && !(screenshot instanceof File)) {
      return NextResponse.json({ error: "Paste the job description to continue." }, { status: 400 });
    }
    if (!(resumeFile instanceof File) && !resumeInput && !form.get("profile")) {
      return NextResponse.json({ error: "Upload your resume or paste its text to continue." }, { status: 400 });
    }

    if (resumeFile && !(resumeFile instanceof File)) {
      return NextResponse.json({ error: "The resume upload is invalid." }, { status: 400 });
    }

    let profile: Profile;
    if (resumeFile instanceof File || resumeInput) {
      const resumeText = resumeFile instanceof File
        ? await readResumeFile(resumeFile)
        : normalizeResumeText(resumeInput);
      profile = await extractResumeProfile(resumeText);
    } else {
      // Backward compatibility for clients that still submit a saved profile.
      let profileRaw: unknown;
      try {
        profileRaw = JSON.parse(String(form.get("profile") ?? ""));
      } catch {
        return NextResponse.json({ error: "Upload your resume or paste its text to continue." }, { status: 400 });
      }
      const parsed = ProfileSchema.safeParse(profileRaw);
      if (!parsed.success) {
        const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        return NextResponse.json({ error: `Invalid profile - ${msg}` }, { status: 400 });
      }
      profile = parsed.data;
    }

    const image = screenshot instanceof File ? await fileToInlineImage(screenshot) : undefined;

    const result = await runAgent({
      ...(jobDescription ? { jobText: jobDescription } : { image }),
      profile,
      tone,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ResumeError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof ImageError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof AgentError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof GeminiError) {
      const status = err.kind === "config" || err.kind === "auth" ? 500 : 502;
      return NextResponse.json({ error: err.message, kind: err.kind }, { status });
    }
    console.error(err);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
