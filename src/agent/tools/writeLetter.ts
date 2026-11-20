import { generate } from "@/lib/gemini";
import { loadPrompt } from "@/lib/prompts";
import type { Job, Match, Profile, Tone } from "@/lib/schemas";

export interface WriteLetterInput {
  job: Job;
  profile: Profile;
  match: Match;
  gaps: string[];
  tone: Tone;
  fixes?: string[];
}

/** Tool 3: draft (or revise) the cover letter message. */
export async function writeLetter(input: WriteLetterInput): Promise<string> {
  const system = await loadPrompt("letter");
  const { text } = await generate({
    system,
    parts: [{ text: JSON.stringify(input) }],
    temperature: 0.6,
  });
  return text.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/, "").trim();
}
