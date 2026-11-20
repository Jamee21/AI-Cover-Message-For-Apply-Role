import { ProfileSchema, type Profile } from "./schemas";
import { DEFAULT_PROFILE } from "./defaultProfile";

const KEY = "cla.profile";

/** Profile lives in the browser (localStorage): free, private, works on Vercel. */
export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = ProfileSchema.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
    }
  } catch {
    /* storage unavailable or corrupted: fall back to default */
  }
  return DEFAULT_PROFILE;
}

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function resetProfile(): Profile {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  return DEFAULT_PROFILE;
}
