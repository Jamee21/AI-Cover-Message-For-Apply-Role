import { readFile } from "node:fs/promises";
import path from "node:path";
import { generateJson } from "@/lib/gemini";
import { JobSchema, type Job } from "@/lib/schemas";
import type { InlineImage } from "@/lib/imageUtils";

async function loadPrompt(): Promise<string> {
  return readFile(path.join(process.cwd(), "src/agent/prompts/extract.txt"), "utf8");
}

/** Tool 1: screenshot -> structured, validated job details. */
export async function extractJob(image: InlineImage): Promise<{ job: Job; model: string }> {
  const system = await loadPrompt();
  const { data, model } = await generateJson(JobSchema, {
    system,
    parts: [{ inlineData: image }, { text: "Extract the job details from this screenshot." }],
  });
  return { job: data, model };
}
