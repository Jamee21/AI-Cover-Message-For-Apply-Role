import { z } from "zod";

// Lenient helpers: models sometimes return null / "" / missing fields.
const text = z
  .string()
  .nullish()
  .transform((v) => (v && v.trim() ? v.trim() : null));

const list = z
  .array(z.string())
  .nullish()
  .transform((v) => (v ?? []).map((s) => s.trim()).filter(Boolean));

/* ---------- Job (extracted from screenshot) ---------- */
export const JobSchema = z.object({
  isJobPosting: z.boolean().catch(false),
  title: text,
  company: text,
  location: text,
  employmentType: text,
  workMode: text,
  experienceLevel: text,
  skills: list,
  responsibilities: list,
  requirements: list,
  niceToHave: list,
  applicationInstructions: text,
  summary: text,
});
export type Job = z.infer<typeof JobSchema>;

/* ---------- Candidate profile ---------- */
export const ProfileSchema = z.object({
  name: z.string().trim().min(1, "name is required"),
  email: text,
  phone: text,
  location: text,
  summary: text,
  skills: list,
  experience: z
    .array(
      z.object({
        role: z.string().min(1),
        company: z.string().min(1),
        period: text,
        highlights: list,
      })
    )
    .default([]),
  projects: z
    .array(
      z.object({
        name: z.string().min(1),
        description: text,
        tech: list,
        link: text,
      })
    )
    .default([]),
  education: z
    .array(z.object({ degree: z.string().min(1), institution: z.string().min(1), period: text }))
    .default([]),
  links: list,
});
export type Profile = z.infer<typeof ProfileSchema>;

/* ---------- Agent intermediate results ---------- */
export const MatchSchema = z.object({
  matchedSkills: list,
  relevantProjects: list,
  relevantExperience: list,
  angle: text,
});
export type Match = z.infer<typeof MatchSchema>;

export const VerifySchema = z.object({
  ok: z.boolean().catch(false),
  problems: list,
});
export type Verification = z.infer<typeof VerifySchema>;

export const TONES = ["formal", "friendly", "short"] as const;
export type Tone = (typeof TONES)[number];
