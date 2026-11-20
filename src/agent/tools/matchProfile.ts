import { generateJson } from "@/lib/gemini";
import { loadPrompt } from "@/lib/prompts";
import { MatchSchema, type Job, type Match, type Profile } from "@/lib/schemas";

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Tool 2: LLM proposes a match, then CODE enforces that it only uses real profile data. */
export async function matchProfile(
  job: Job,
  profile: Profile
): Promise<{ match: Match; gaps: string[] }> {
  const system = await loadPrompt("match");
  const { data } = await generateJson(MatchSchema, {
    system,
    parts: [{ text: JSON.stringify({ job, profile }) }],
  });

  const knownSkills = new Set(
    [...profile.skills, ...profile.projects.flatMap((p) => p.tech)].map(norm)
  );
  const knownProjects = new Set(profile.projects.map((p) => norm(p.name)));

  const match: Match = {
    ...data,
    matchedSkills: data.matchedSkills.filter((s) => knownSkills.has(norm(s))),
    relevantProjects: data.relevantProjects.filter((n) => knownProjects.has(norm(n))).slice(0, 2),
    relevantExperience: data.relevantExperience.slice(0, 2),
  };

  // Skills the job wants that the candidate does not have: the letter must never claim these.
  const gaps = job.skills.filter((s) => !knownSkills.has(norm(s)));
  return { match, gaps };
}
