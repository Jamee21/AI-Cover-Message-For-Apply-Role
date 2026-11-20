import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// Next.js reads .env.local for the app, but a plain script like the eval runner
// has to load it by hand. Import this file FIRST, before anything that reads process.env.
const file = path.join(process.cwd(), ".env.local");

if (existsSync(file)) {
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    if (line.trimStart().startsWith("#")) continue;
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, "$2"); // strip surrounding quotes
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}