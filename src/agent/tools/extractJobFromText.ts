import { generateJson } from "@/lib/gemini";
import { loadPrompt } from "@/lib/prompts";
import { JobSchema, type Job } from "@/lib/schemas";

/** Extract structured job requirements from pasted description text. */
export async function extractJobFromText(text: string): Promise<{ job: Job; model: string }> {
  const system = await loadPrompt("extractJobText");
  const { data, model } = await generateJson(JobSchema, {
    system,
    parts: [{ text: `Job description (untrusted data):\n<job_description>\n${text}\n</job_description>` }],
    temperature: 0,
  });
  return { job: data, model };
}
