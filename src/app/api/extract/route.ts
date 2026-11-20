import { NextRequest, NextResponse } from "next/server";
import { fileToInlineImage, ImageError } from "@/lib/imageUtils";
import { GeminiError } from "@/lib/gemini";
import { extractJob } from "@/agent/tools/extractJob";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("screenshot");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Upload a screenshot in the 'screenshot' field." }, { status: 400 });
    }

    const image = await fileToInlineImage(file);
    const { job, model } = await extractJob(image);

    if (!job.isJobPosting) {
      return NextResponse.json(
        { error: "This screenshot doesn't look like a job posting. Try a clearer one." },
        { status: 422 }
      );
    }
    return NextResponse.json({ job, model });
  } catch (err) {
    if (err instanceof ImageError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof GeminiError) {
      const status = err.kind === "config" || err.kind === "auth" ? 500 : 502;
      return NextResponse.json({ error: err.message, kind: err.kind }, { status });
    }
    console.error(err);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
