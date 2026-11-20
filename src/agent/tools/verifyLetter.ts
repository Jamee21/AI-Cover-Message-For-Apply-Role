import { generateJson } from "@/lib/gemini";
import { loadPrompt } from "@/lib/prompts";
import { VerifySchema, type Profile, type Verification } from "@/lib/schemas";

/** Tool 4: guardrail. Rejects letters that claim things the profile does not support. */
export async function verifyLetter(letter: string, profile: Profile): Promise<Verification> {
  const system = await loadPrompt("verify");
  const { data } = await generateJson(VerifySchema, {
    system,
    parts: [{ text: JSON.stringify({ letter, profile }) }],
    temperature: 0,
  });

  const problems = [...data.problems];
  // Deterministic check the LLM can miss.
  if (/\[[^\]]{1,40}\]/.test(letter)) problems.push("Letter contains placeholder text like [..].");
  return { ok: problems.length === 0, problems };
}
