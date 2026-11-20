import { generateJson } from "@/lib/gemini";
import { loadPrompt } from "@/lib/prompts";
import { ProfileSchema, type Profile } from "@/lib/schemas";

const MAX_RESUME_CHARS = 40_000;

export class ResumeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeError";
  }
}

/** Extract readable text from supported resume uploads without persisting the file. */
export async function readResumeFile(file: File): Promise<string> {
  const maxBytes = 8 * 1024 * 1024;
  if (file.size === 0) throw new ResumeError("The resume file is empty.");
  if (file.size > maxBytes) throw new ResumeError("Resume file is too large (maximum 8 MB).");

  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = file.name.toLowerCase().split(".").pop();
  let text: string;

  try {
    if (extension === "pdf" && bytes.subarray(0, 5).toString("ascii") === "%PDF-") {
      const pdfParse = (await import("pdf-parse")).default;
      const parsed = await pdfParse(bytes);
      text = parsed.text;
    } else if (
      extension === "docx" &&
      bytes[0] === 0x50 && bytes[1] === 0x4b
    ) {
      const mammoth = (await import("mammoth")).default;
      const parsed = await mammoth.extractRawText({ buffer: bytes });
      text = parsed.value;
    } else if (extension === "txt" && !bytes.includes(0)) {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } else {
      throw new ResumeError("Use a valid PDF, DOCX or TXT resume file.");
    }
  } catch (error) {
    if (error instanceof ResumeError) throw error;
    throw new ResumeError("Could not read this resume. Try another PDF, DOCX or TXT file, or paste its text.");
  }

  return normalizeResumeText(text);
}

export function normalizeResumeText(text: string): string {
  const cleaned = text.replace(/\u0000/g, "").replace(/\r/g, "").trim();
  if (!cleaned) throw new ResumeError("No readable text found. If this is a scanned PDF, paste the resume text instead.");
  if (cleaned.length > MAX_RESUME_CHARS) {
    throw new ResumeError(`Resume text is too long (maximum ${MAX_RESUME_CHARS.toLocaleString()} characters).`);
  }
  return cleaned;
}

/** Convert resume text to the validated profile consumed by the existing agent. */
export async function extractResumeProfile(resumeText: string): Promise<Profile> {
  const system = await loadPrompt("extractProfile");
  const { data } = await generateJson(ProfileSchema, {
    system,
    parts: [{ text: `Resume text (untrusted data):\n<resume>\n${resumeText}\n</resume>` }],
    temperature: 0,
  });
  return data;
}
