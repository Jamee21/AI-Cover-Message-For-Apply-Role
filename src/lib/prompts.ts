import { readFile } from "node:fs/promises";
import path from "node:path";

export type PromptName = "extract" | "extractJobText" | "extractProfile" | "match" | "letter" | "verify" | "refine";

export function loadPrompt(name: PromptName): Promise<string> {
  return readFile(path.join(process.cwd(), "src/agent/prompts", `${name}.txt`), "utf8");
}